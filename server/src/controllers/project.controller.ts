import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service';

export class ProjectController {
  async findAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const projects = await projectService.findAll();
      res.json(projects);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.findById(req.params.id as string);
      res.json(project);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.create(req.body);
      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.update(req.params.id as string, req.body);
      res.json(project);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await projectService.delete(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
