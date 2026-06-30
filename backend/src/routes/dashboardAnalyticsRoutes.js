import express from 'express';
import { getDashboardAnalytics, getDashboardFilters } from '../controllers/dashboardAnalyticsController.js';

const router = express.Router();

router.get('/', getDashboardAnalytics);
router.get('/filters', getDashboardFilters);

export default router;
