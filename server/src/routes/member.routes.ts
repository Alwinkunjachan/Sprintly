import { Router } from 'express';
import { memberController } from '../controllers/member.controller';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createMemberSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
});

const updateMemberSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

router.get('/', (req, res, next) => memberController.findAll(req, res, next));
router.post('/', validate(createMemberSchema), (req, res, next) => memberController.create(req, res, next));
router.patch('/:id', validate(updateMemberSchema), (req, res, next) => memberController.update(req, res, next));

export default router;
