import { Op } from 'sequelize';
import { Member } from '../models';
import { ApiError } from '../utils/api-error';

export class MemberService {
  async findAll() {
    return Member.findAll({ order: [['name', 'ASC']] });
  }

  async findNonAdminUsers() {
    return Member.findAll({
      where: { role: { [Op.ne]: 'admin' } },
      order: [['name', 'ASC']],
    });
  }

  async findById(id: string) {
    const member = await Member.findByPk(id);
    if (!member) throw ApiError.notFound('Member not found');
    return member;
  }

  async create(data: { name: string; email: string; avatarUrl?: string }) {
    return Member.create({
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl || null,
    });
  }

  async update(id: string, data: Partial<{ name: string; email: string; avatarUrl: string }>) {
    const member = await this.findById(id);
    return member.update(data);
  }

  async toggleBlock(id: string) {
    const member = await this.findById(id);
    if (member.role === 'admin') {
      throw ApiError.badRequest('Cannot block an admin user');
    }
    if (member.blocked) {
      // Unblock — reset everything
      await member.update({
        blocked: false,
        failedLoginAttempts: 0,
        blockedReason: null,
        blockedAt: null,
      });
    } else {
      // Block by admin
      await member.update({
        blocked: true,
        blockedReason: 'admin',
        blockedAt: new Date(),
      });
    }
    return member;
  }
}

export const memberService = new MemberService();
