import Ticket from '../models/Ticket.js';

// Create a new support ticket
export const createTicket = async (req, res) => {
    try {
        const { customer, subject, category, description, orderId, attachments } = req.body;
        
        const newTicket = new Ticket({
            customer,
            subject,
            category,
            description,
            order: orderId || null,
            messages: [{
                sender: customer,
                senderRole: 'Customer',
                message: description,
                attachments: attachments || []
            }]
        });

        await newTicket.save();
        
        // Emit socket event for Admin
        const { getIO } = await import('../socket.js');
        const io = getIO();
        if (io) {
            io.emit('new_ticket', {
                ticketId: newTicket._id,
                customerName: 'Customer', // Would be better with name from req.body or DB
                subject: newTicket.subject
            });
        }

        res.status(201).json(newTicket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get customer tickets
export const getCustomerTickets = async (req, res) => {
    try {
        const { customerId } = req.params;
        const tickets = await Ticket.find({ customer: customerId }).sort({ createdAt: -1 });
        res.status(200).json(tickets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all tickets (Admin)
export const getAllTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find()
            .populate('customer', 'displayName phone email role')
            .populate('order', 'totalAmount status createdAt items')
            .sort({ createdAt: -1 });
        res.status(200).json(tickets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add a message to a ticket (Chat)
export const addMessage = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { sender, senderRole, message, attachments } = req.body;

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const newMessage = { 
            sender, 
            senderRole, 
            message,
            attachments: attachments || [] 
        };

        ticket.messages.push(newMessage);
        ticket.lastMessageAt = Date.now();
        
        if (senderRole === 'Admin' && ticket.status === 'Open') {
            ticket.status = 'In Progress';
        }

        await ticket.save();

        // Real-time Update via Socket
        const { getIO } = await import('../socket.js');
        const io = getIO();
        if (io) {
            // Emit to a specific ticket room
            io.to(`ticket_${ticketId}`).emit('new_message', {
                ticketId,
                message: newMessage
            });
        }

        res.status(200).json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update ticket status
export const updateTicketStatus = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;

        const ticket = await Ticket.findByIdAndUpdate(
            ticketId, 
            { status }, 
            { new: true }
        );

        // Emit status update to customer
        const { getIO } = await import('../socket.js');
        const io = getIO();
        if (io) {
            io.to(`ticket_${ticketId}`).emit('status_updated', {
                ticketId,
                status
            });
        }
        
        res.status(200).json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update ticket (Customer)
export const updateTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { subject, category, description } = req.body;

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
        
        if (ticket.status === 'Resolved') {
            return res.status(400).json({ message: 'Resolved tickets cannot be edited' });
        }

        ticket.subject = subject || ticket.subject;
        ticket.category = category || ticket.category;
        ticket.description = description || ticket.description;

        await ticket.save();
        res.status(200).json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete ticket
export const deleteTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findByIdAndDelete(ticketId);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
        res.status(200).json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single ticket details
export const getTicketDetails = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findById(ticketId)
            .populate('customer', 'displayName phone email role')
            .populate('order', 'totalAmount status createdAt items')
            .populate('messages.sender', 'displayName profileImage role');
            
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
        res.status(200).json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
