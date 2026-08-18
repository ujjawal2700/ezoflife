import jwt from 'jsonwebtoken';

/**
 * Middleware: verifyAdmin
 * Checks that the request carries a valid JWT signed for an Admin role.
 * Attach it to any route that should only be accessible to admins.
 *
 * Token must be sent as:
 *   Authorization: Bearer <token>
 */
export const verifyAdmin = async (req, res, next) => {
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

        // Retrieve admin status and permissions from DB to enforce Read-Only restriction
        const User = (await import('../models/User.js')).default;
        const adminUser = await User.findById(decoded.id);
        
        if (adminUser) {
            if (adminUser.status !== 'approved') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin account is not active.'
                });
            }

            // Read-Only check: Block write/mutation operations (POST, PUT, DELETE, PATCH)
            if (adminUser.adminAccessType === 'Read-Only' && req.method !== 'GET') {
                return res.status(403).json({
                    success: false,
                    message: 'Access Denied. You have Read-Only permissions.'
                });
            }
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

/**
 * Middleware: verifyAdminOrVendor
 * Checks that the request carries a valid JWT signed for an Admin or Vendor role.
 *
 * Token must be sent as:
 *   Authorization: Bearer <token>
 */
export const verifyAdminOrVendor = (req, res, next) => {
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

        // Must be Admin or Vendor role
        if (decoded.role !== 'Admin' && decoded.role !== 'Vendor') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden. Access required.'
            });
        }

        // Attach decoded payload to request for downstream use
        req.user = decoded;
        if (decoded.role === 'Admin') {
            req.admin = decoded;
        }

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


/**
 * Middleware: verifyUser
 *
 * Accepts any authenticated role. Use it on routes that a logged-in customer,
 * vendor or supplier may call — the route decides *who* may act, the handler
 * decides *what* they may act on.
 *
 * Attaches `req.user = { id, role, phone }`.
 *
 * IMPORTANT: handlers must take identity from `req.user.id`, never from
 * `req.body.customerId`. Middleware alone does not stop a logged-in user
 * acting as somebody else — see `resolveActorId` below.
 */
export const verifyUser = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(
            authHeader.split(' ')[1],
            process.env.JWT_SECRET || 'ezoflife_secret_key_2026'
        );

        if (!decoded?.id) {
            return res.status(401).json({ success: false, message: 'Invalid token payload.' });
        }

        req.user = decoded;
        if (decoded.role === 'Admin') req.admin = decoded;

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

/**
 * The id of the account a request is acting *as*.
 *
 * Normally that is the caller. An Admin may act on behalf of another account
 * (support, walk-in orders raised by staff), so an explicit id in the body is
 * honoured only for Admins — for everyone else the token wins, which is what
 * closes "anyone can place orders as anyone".
 */
export const resolveActorId = (req, bodyField = 'customerId') => {
    if (req.user?.role === 'Admin' && req.body?.[bodyField]) {
        return req.body[bodyField];
    }
    return req.user?.id;
};

/**
 * True when the caller owns the resource, or is an Admin.
 * `ownerId` may be an ObjectId, a populated doc, or a string.
 */
export const isOwnerOrAdmin = (req, ownerId) => {
    if (req.user?.role === 'Admin') return true;
    if (!ownerId || !req.user?.id) return false;
    const owner = ownerId._id ? ownerId._id.toString() : ownerId.toString();
    return owner === req.user.id.toString();
};
