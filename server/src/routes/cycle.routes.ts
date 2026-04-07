import { Router } from 'express';
import { cycleController } from '../controllers/cycle.controller';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createCycleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['upcoming', 'active', 'completed']).optional(),
  projectId: z.string().uuid(),
});

const updateCycleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['upcoming', 'active', 'completed']).optional(),
});

router.get('/', (req, res, next) => cycleController.findAll(req, res, next));
router.get('/:id', (req, res, next) => cycleController.findById(req, res, next));
router.post('/', validate(createCycleSchema), (req, res, next) => cycleController.create(req, res, next));
router.patch('/:id', validate(updateCycleSchema), (req, res, next) => cycleController.update(req, res, next));
router.delete('/:id', (req, res, next) => cycleController.delete(req, res, next));

export default router;
