// routes/vendorQuotes.js
const express = require('express');
const router = express.Router();
const VendorQuote = require('../models/VendorQuote');
const axios = require('axios');

// Get product info from external API
router.get('/product/:itemId', async (req, res) => {
  try {
    // Fetch from external API
    const response = await axios.get(
      `https://other-userpanel.basavamart.com/api/basket-items/${req.params.itemId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.EXTERNAL_API_TOKEN}`
        }
      }
    );
    
    // Return vendor-safe data
    const product = response.data;
    const safeData = {
      _id: product._id,
      productName: product.productName,
      productImage: product.productImage,
      variant: product.variant,
      quantity: product.quantity,
      memberNote: product.memberNote,
      memberMessage: product.memberMessage,
      createdAt: product.createdAt
    };
    
    res.json({ success: true, product: safeData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all quotes for a product (from our own collection)
router.get('/quotes/:itemId', async (req, res) => {
  try {
    const quotes = await VendorQuote.find({ 
      externalItemId: req.params.itemId,
      status: { $ne: 'rejected' } // Filter out rejected quotes
    })
    .sort({ quotedPrice: 1, submittedAt: -1 })
    .lean();
    
    res.json({ success: true, quotes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit new quote (store in our collection)
router.post('/submit-quote', async (req, res) => {
  try {
    const { itemId, vendorName, vendorEmail, vendorPhone, quotedPrice, remarks } = req.body;
    
    // Check if vendor already submitted a quote for this item
    const existingQuote = await VendorQuote.findOne({
      externalItemId: itemId,
      vendorEmail: vendorEmail
    });
    
    let quote;
    
    if (existingQuote) {
      // Update existing quote
      existingQuote.quotedPrice = quotedPrice;
      existingQuote.remarks = remarks;
      existingQuote.submittedAt = new Date();
      await existingQuote.save();
      quote = existingQuote;
    } else {
      // Create new quote
      quote = new VendorQuote({
        externalItemId: itemId,
        vendorName,
        vendorEmail,
        vendorPhone,
        quotedPrice,
        remarks
      });
      await quote.save();
    }
    
    // Optional: Notify admin via webhook
    notifyAdminNewQuote(itemId, quote);
    
    res.json({
      success: true,
      message: 'Quote submitted successfully',
      quote: quote.toObject()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook to sync quotes to external system (if needed)
router.post('/webhook/sync-to-external', async (req, res) => {
  try {
    const { itemId, quoteId } = req.body;
    
    const quote = await VendorQuote.findById(quoteId);
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }
    
    // Push quote to external API if it supports vendorQuotes field
    await axios.patch(
      `https://other-userpanel.basavamart.com/api/basket-items/${itemId}/add-vendor-quote`,
      {
        vendorQuote: {
          vendorName: quote.vendorName,
          vendorEmail: quote.vendorEmail,
          vendorPhone: quote.vendorPhone,
          quotedPrice: quote.quotedPrice,
          remarks: quote.remarks,
          submittedAt: quote.submittedAt
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.EXTERNAL_API_TOKEN}`
        }
      }
    );
    
    res.json({ success: true, message: 'Synced to external system' });
  } catch (error) {
    console.error('Sync error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Get all quotes across all products
router.get('/admin/all-quotes', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, sortBy = 'submittedAt' } = req.query;
    
    const query = {};
    if (status) query.status = status;
    
    const quotes = await VendorQuote.find(query)
      .sort({ [sortBy]: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    
    const total = await VendorQuote.countDocuments(query);
    
    res.json({
      success: true,
      quotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Update quote status
router.put('/admin/quote/:quoteId', async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    
    const quote = await VendorQuote.findByIdAndUpdate(
      req.params.quoteId,
      { status, adminNote, reviewedAt: new Date() },
      { new: true }
    );
    
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }
    
    res.json({ success: true, quote });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to notify admin
async function notifyAdminNewQuote(itemId, quote) {
  try {
    // Send email notification
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `New Vendor Quote for Item ${itemId}`,
      html: `
        <h2>New Vendor Quote Submitted</h2>
        <p><strong>Product ID:</strong> ${itemId}</p>
        <p><strong>Vendor:</strong> ${quote.vendorName}</p>
        <p><strong>Email:</strong> ${quote.vendorEmail}</p>
        <p><strong>Phone:</strong> ${quote.vendorPhone}</p>
        <p><strong>Price:</strong> ₹${quote.quotedPrice}</p>
        <p><strong>Remarks:</strong> ${quote.remarks || 'None'}</p>
        <p><strong>Time:</strong> ${quote.submittedAt.toLocaleString()}</p>
        <br>
        <a href="${process.env.ADMIN_PANEL_URL}/vendor-quotes">View All Quotes</a>
      `
    });
    
    // Optional: Send Slack/Teams notification
    if (process.env.SLACK_WEBHOOK_URL) {
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `📋 New vendor quote submitted!\n*Product:* ${itemId}\n*Vendor:* ${quote.vendorName}\n*Price:* ₹${quote.quotedPrice}\n*Remarks:* ${quote.remarks || 'None'}`
      });
    }
  } catch (error) {
    console.error('Notification error:', error.message);
  }
}

// Helper function to send email
async function sendEmail({ to, subject, html }) {
  // Implement your email sending logic here
  // Using nodemailer, sendgrid, etc.
}

module.exports = router;