import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireCapability } from '@/middleware/requireCapability.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = Router();

// Was authenticate-only - any authenticated role, including agent, could
// call this directly (found during Phase 5.1's frontend route-guard audit;
// the client never exposed /dashboard beyond admin+, but the API itself
// never enforced it). ANALYTICS_VIEW matches the client's CapabilityRoute
// gate on /dashboard (App.tsx/router.tsx) - same cross-module business
// overview content, same boundary on both sides.
router.use(authenticate, requireCapability('ANALYTICS_VIEW'));
router.get('/', dashboardController.getDashboard);

export default router;
