import { Request, Response, NextFunction } from 'express';
import { cycleService } from '../services/cycle.service';

export class CycleController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const cycles = await cycleService.findAll(req.query.projectId as string);
      res.json(cycles);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const cycle = await cycleService.findById(req.params.id as string);
      res.json(cycle);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const cycle = await cycleService.create(req.body);
      res.status(201).json(cycle);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const cycle = await cycleService.update(req.params.id as string, req.body);

      // If cycle is marked completed, move incomplete issues to backlog
      if (req.body.status === 'completed') {
        const moved = await cycleService.handleCycleCompletion(req.params.id as string);
        if (moved > 0) {
          console.log(`Moved ${moved} incomplete issue(s) to backlog for cycle "${cycle.name}"`);
        }
      }

      res.json(cycle);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await cycleService.delete(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const cycleController = new CycleController();
