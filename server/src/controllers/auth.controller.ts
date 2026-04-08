import { Request, Response, NextFunction } from 'express';
import passport from '../config/passport';
import { authService } from '../services/auth.service';
import { ApiError } from '../utils/api-error';
import { Member } from '../models/member.model';
import { env } from '../config/environment';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    passport.authenticate(
      'local',
      { session: false },
      async (err: any, member: Member | false, info: any) => {
        try {
          if (err) return next(err);
          if (!member) {
            throw ApiError.unauthorized(info?.message || 'Invalid credentials');
          }
          const result = await authService.login(member);
          res.json(result);
        } catch (error) {
          next(error);
        }
      }
    )(req, res, next);
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.refresh(req.body.refreshToken);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await authService.getProfile(req.member!.id);
      res.json(member);
    } catch (error) {
      next(error);
    }
  }

  async logout(_req: Request, res: Response) {
    res.json({ message: 'Logged out successfully' });
  }

  async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const member = req.user as Member;
      const result = await authService.login(member);
      const params = new URLSearchParams({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      res.redirect(`${env.clientUrl}/auth/google/callback?${params.toString()}`);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
