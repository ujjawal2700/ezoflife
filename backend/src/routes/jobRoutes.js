import express from 'express';
import { 
    createJob, 
    getVendorJobs, 
    getAllActiveJobs, 
    applyToJob, 
    getVendorApplications,
    getAdminApplications,
    getAdminAllJobs,
    deleteJob
} from '../controllers/jobController.js';

import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `resume-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

const router = express.Router();

import { verifyAdmin } from '../middleware/authMiddleware.js';

router.post('/', createJob);
router.get('/admin/all', verifyAdmin, getAdminAllJobs);
router.get('/admin/applications', verifyAdmin, getAdminApplications);
router.get('/vendor', getVendorJobs); // Expected ?vendorId=
router.get('/active', getAllActiveJobs);
router.post('/apply', upload.single('resume'), applyToJob);
router.get('/vendor/:vendorId/applications', getVendorApplications);
router.delete('/:id', verifyAdmin, deleteJob);

export default router;
