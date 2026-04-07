import { Router } from 'express';
import { projectController } from '../controllers/project.controller';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  identifier: z.string().min(2).max(5).transform((v) => v.toUpperCase()),
  description: z.string().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

router.get('/', (req, res, next) => projectController.findAll(req, res, next));
router.get('/:id', (req, res, next) => projectController.findById(req, res, next));
router.post('/', validate(createProjectSchema), (req, res, next) => projectController.create(req, res, next));
router.patch('/:id', validate(updateProjectSchema), (req, res, next) => projectController.update(req, res, next));
router.delete('/:id', (req, res, next) => projectController.delete(req, res, next));

export default router;
