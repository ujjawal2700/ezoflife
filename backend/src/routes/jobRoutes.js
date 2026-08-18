import express from 'express';
import { 
    createJob, 
    getVendorJobs, 
    getAllActiveJobs, 
    applyToJob, 
    getVendorApplications,
    getAdminApplications,
    getAdminAllJobs,
    deleteJob,
    updateJob,
    updateJobStatus,
    updateApplicationStatus,
    updateApplicationNotes,
    deleteApplication,
    getAppliedJobIds,
    getApplicantApplications
} from '../controllers/jobController.js';
import { 
    getRoleTemplates, 
    createRoleTemplate, 
    updateRoleTemplate, 
    deleteRoleTemplate 
} from '../controllers/roleTemplateController.js';

import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `resume-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

const router = express.Router();

import { verifyAdmin, verifyUser } from '../middleware/authMiddleware.js';

router.post('/', verifyAdmin, createJob);
router.get('/admin/all', verifyAdmin, getAdminAllJobs);
router.get('/admin/applications', verifyAdmin, getAdminApplications);
router.get('/vendor', getVendorJobs); // Expected ?vendorId=
router.get('/active', getAllActiveJobs);
router.post('/apply', upload.single('resume'), applyToJob);
router.get('/vendor/:vendorId/applications', getVendorApplications);
router.get('/applicant/:applicantId/applied-job-ids', getAppliedJobIds);
router.get('/applicant/:applicantId/applications', getApplicantApplications);
router.patch('/applications/:id/status', verifyAdmin, updateApplicationStatus);
router.put('/applications/:id/notes', verifyAdmin, updateApplicationNotes);
router.delete('/applications/:id', verifyAdmin, deleteApplication);
router.patch('/:id/status', verifyAdmin, updateJobStatus);
router.put('/:id', verifyAdmin, updateJob);
router.delete('/:id', verifyAdmin, deleteJob);

// Role Templates Master Data
router.get('/role-templates', getRoleTemplates);
router.post('/role-templates', verifyAdmin, createRoleTemplate);
router.put('/role-templates/:id', verifyAdmin, updateRoleTemplate);
router.delete('/role-templates/:id', verifyAdmin, deleteRoleTemplate);

export default router;
