import { Router } from 'express';
import { labelController } from '../controllers/label.controller';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createLabelSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const updateLabelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

router.get('/', (req, res, next) => labelController.findAll(req, res, next));
router.post('/', validate(createLabelSchema), (req, res, next) => labelController.create(req, res, next));
router.patch('/:id', validate(updateLabelSchema), (req, res, next) => labelController.update(req, res, next));
router.delete('/:id', (req, res, next) => labelController.delete(req, res, next));

export default router;
