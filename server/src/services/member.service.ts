import { Member } from '../models';
import { ApiError } from '../utils/api-error';

export class MemberService {
  async findAll() {
    return Member.findAll({ order: [['name', 'ASC']] });
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
}

export const memberService = new MemberService();
