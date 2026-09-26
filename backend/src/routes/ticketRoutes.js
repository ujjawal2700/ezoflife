import express from 'express';
import { 
    createTicket, 
    getCustomerTickets, 
    getAllTickets, 
    addMessage, 
    updateTicketStatus,
    getTicketDetails,
    updateTicket,
    deleteTicket
} from '../controllers/ticketController.js';
import { verifyAdmin, verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Customer Routes
// User & Order Routes
router.post('/create', verifyUser, createTicket);
router.post('/', verifyUser, createTicket);
router.get('/customer/:customerId', getCustomerTickets);
router.get('/order/:orderId', async (req, res) => {
    try {
        const Ticket = (await import('../models/Ticket.js')).default;
        const filter = { order: req.params.orderId };
        if (req.query.role) {
            filter.userType = req.query.role;
        }
        const ticket = await Ticket.findOne(filter)
            .populate('customer', 'displayName phone email role')
            .populate('vendor', 'displayName phone email role shopDetails')
            .sort({ createdAt: -1 });
        res.status(200).json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.get('/:ticketId', getTicketDetails);
router.put('/:ticketId', verifyUser, updateTicket);
router.delete('/:ticketId', verifyAdmin, deleteTicket);
router.post('/:ticketId/message', verifyUser, addMessage);
router.post('/:ticketId/messages', verifyUser, addMessage);

// Admin Routes
router.get('/admin/all', verifyAdmin, getAllTickets);
router.get('/', verifyAdmin, getAllTickets);
router.patch('/admin/:ticketId/status', verifyAdmin, updateTicketStatus);

export default router;
