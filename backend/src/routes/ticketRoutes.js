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

const router = express.Router();

// Customer Routes
router.post('/create', createTicket);
router.get('/customer/:customerId', getCustomerTickets);
router.get('/order/:orderId', async (req, res) => {
    try {
        const Ticket = (await import('../models/Ticket.js')).default;
        const ticket = await Ticket.findOne({ order: req.params.orderId }).sort({ createdAt: -1 });
        res.status(200).json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.get('/:ticketId', getTicketDetails);
router.put('/:ticketId', updateTicket);
router.delete('/:ticketId', deleteTicket);
router.post('/:ticketId/message', addMessage);

// Admin Routes
router.get('/admin/all', getAllTickets);
router.patch('/admin/:ticketId/status', updateTicketStatus);

export default router;
