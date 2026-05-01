import express from 'express';
import { saveOverride, getOverridesByArea } from '../controllers/areaOverrideController.js';

const router = express.Router();

router.post('/', saveOverride);
router.get('/area/:areaId', getOverridesByArea);

export default router;
