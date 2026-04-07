import { Request, Response, NextFunction } from 'express';
import { issueService } from '../services/issue.service';

export class IssueController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const issues = await issueService.findAll(req.query as any);
      res.json(issues);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const issue = await issueService.findById(req.params.id as string);
      res.json(issue);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const issue = await issueService.create(req.body);
      res.status(201).json(issue);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const issue = await issueService.update(req.params.id as string, req.body);
      res.json(issue);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await issueService.delete(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const issueController = new IssueController();
