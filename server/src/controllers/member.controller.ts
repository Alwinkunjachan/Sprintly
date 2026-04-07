import { Request, Response, NextFunction } from 'express';
import { memberService } from '../services/member.service';

export class MemberController {
  async findAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const members = await memberService.findAll();
      res.json(members);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await memberService.create(req.body);
      res.status(201).json(member);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await memberService.update(req.params.id as string, req.body);
      res.json(member);
    } catch (error) {
      next(error);
    }
  }
}

export const memberController = new MemberController();
