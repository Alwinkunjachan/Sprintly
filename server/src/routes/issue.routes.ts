import { Router } from 'express';
import { issueController } from '../controllers/issue.controller';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createIssueSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'ready_to_test', 'testing_in_progress', 'done', 'cancelled']).optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().optional().nullable(),
  cycleId: z.string().uuid().optional().nullable(),
  labelIds: z.array(z.string().uuid()).optional(),
});

const updateIssueSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'ready_to_test', 'testing_in_progress', 'done', 'cancelled']).optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  cycleId: z.string().uuid().optional().nullable(),
  labelIds: z.array(z.string().uuid()).optional(),
});

router.get('/', (req, res, next) => issueController.findAll(req, res, next));
router.get('/:id', (req, res, next) => issueController.findById(req, res, next));
router.post('/', validate(createIssueSchema), (req, res, next) => issueController.create(req, res, next));
router.patch('/:id', validate(updateIssueSchema), (req, res, next) => issueController.update(req, res, next));
router.delete('/:id', (req, res, next) => issueController.delete(req, res, next));

export default router;
