import { Router } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import issueRoutes from './issue.routes';
import labelRoutes from './label.routes';
import cycleRoutes from './cycle.routes';
import memberRoutes from './member.routes';
import analyticsRoutes from './analytics.routes';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Public auth routes
router.use('/auth', authRoutes);

// All routes below require authentication
router.use(authenticate);
router.use('/projects', projectRoutes);
router.use('/issues', issueRoutes);
router.use('/labels', labelRoutes);
router.use('/cycles', cycleRoutes);
router.use('/members', memberRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
