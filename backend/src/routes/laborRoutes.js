import express from 'express';
import { addSpecialist, getAllSpecialists, deleteSpecialist, createRequisition, getAllRequisitions, assignRequisition } from '../controllers/laborController.js';
import { verifyAdmin, verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/add', verifyAdmin, addSpecialist);
router.get('/all', getAllSpecialists);
router.delete('/:id', verifyAdmin, deleteSpecialist);

// Requests
router.post('/request', verifyUser, createRequisition);
router.get('/requests', getAllRequisitions);
router.patch('/request/:id/assign', verifyAdmin, assignRequisition);

export default router;
