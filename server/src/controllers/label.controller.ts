import { Request, Response, NextFunction } from 'express';
import { labelService } from '../services/label.service';

export class LabelController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const labels = await labelService.findAll();
      res.json(labels);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const label = await labelService.create(req.body);
      res.status(201).json(label);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const label = await labelService.update(req.params.id as string, req.body);
      res.json(label);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await labelService.delete(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const labelController = new LabelController();
