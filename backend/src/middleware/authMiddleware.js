import jwt from 'jsonwebtoken';

/**
 * Middleware: verifyAdmin
 * Checks that the request carries a valid JWT signed for an Admin role.
 * Attach it to any route that should only be accessible to admins.
 *
 * Token must be sent as:
 *   Authorization: Bearer <token>
 */
export const verifyAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'ezoflife_secret_key_2026'
        );

        // Must be Admin role
        if (decoded.role !== 'Admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden. Admin access required.'
            });
        }

        // Attach decoded payload to request for downstream use
        req.admin = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please log in again.'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid token. Authentication failed.'
        });
    }
};
