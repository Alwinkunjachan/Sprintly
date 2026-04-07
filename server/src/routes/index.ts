import { Router } from 'express';
import projectRoutes from './project.routes';
import issueRoutes from './issue.routes';
import labelRoutes from './label.routes';
import cycleRoutes from './cycle.routes';
import memberRoutes from './member.routes';

const router = Router();

router.use('/projects', projectRoutes);
router.use('/issues', issueRoutes);
router.use('/labels', labelRoutes);
router.use('/cycles', cycleRoutes);
router.use('/members', memberRoutes);

export default router;
