const jwt = require('jsonwebtoken');

/**
 * Authentication middleware to protect admin routes
 * Verifies the JWT token from the Authorization header
 */
const authenticateAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "No authentication token provided. Access denied."
            });
        }

        const token = authHeader.split(' ')[1];

        // Use secret from .env or fallback for development
        const secret = process.env.JWT_SECRET || 'your_default_jwt_secret';

        try {
            const decoded = jwt.verify(token, secret);
            req.admin = decoded;
            next();
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token. Access denied."
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error during authentication"
        });
    }
};

module.exports = { authenticateAdmin };
