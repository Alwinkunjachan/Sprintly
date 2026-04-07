import { Op } from 'sequelize';
import { Cycle, Issue, Project, Member, Label } from '../models';
import { ApiError } from '../utils/api-error';

export class CycleService {
  async findAll(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return Cycle.findAll({
      where,
      include: [{ model: Project, as: 'project', attributes: ['id', 'name', 'identifier'] }],
      order: [['startDate', 'ASC']],
    });
  }

  async findById(id: string) {
    const cycle = await Cycle.findByPk(id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'identifier'] },
        {
          model: Issue,
          as: 'issues',
          include: [
            { model: Member, as: 'assignee', attributes: ['id', 'name', 'email', 'avatarUrl'] },
            { model: Label, as: 'labels', through: { attributes: [] } },
          ],
        },
      ],
    });
    if (!cycle) throw ApiError.notFound('Cycle not found');
    return cycle;
  }

  async create(data: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    status?: string;
    projectId: string;
  }) {
    return Cycle.create({
      name: data.name,
      description: data.description || null,
      startDate: data.startDate,
      endDate: data.endDate,
      status: (data.status as any) || 'upcoming',
      projectId: data.projectId,
    });
  }

  async update(
    id: string,
    data: Partial<{ name: string; description: string; startDate: string; endDate: string; status: string }>
  ) {
    const cycle = await Cycle.findByPk(id);
    if (!cycle) throw ApiError.notFound('Cycle not found');
    return cycle.update(data as any);
  }

  async delete(id: string) {
    const cycle = await Cycle.findByPk(id);
    if (!cycle) throw ApiError.notFound('Cycle not found');
    await cycle.destroy();
  }

  /**
   * Move incomplete issues to backlog when a cycle is marked as completed.
   * Called when cycle status is updated to 'completed' and also by the scheduled check.
   */
  async handleCycleCompletion(cycleId: string) {
    const updated = await Issue.update(
      { status: 'backlog' as any, cycleId: null },
      {
        where: {
          cycleId,
          status: { [Op.notIn]: ['done', 'cancelled'] },
        },
      }
    );
    return updated[0]; // number of rows affected
  }

  /**
   * Auto-complete cycles whose end date has passed and move their incomplete issues to backlog.
   */
  async checkExpiredCycles() {
    const today = new Date().toISOString().split('T')[0];
    const expiredCycles = await Cycle.findAll({
      where: {
        endDate: { [Op.lt]: today },
        status: { [Op.ne]: 'completed' },
      },
    });

    for (const cycle of expiredCycles) {
      await this.handleCycleCompletion(cycle.id);
      await cycle.update({ status: 'completed' });
      console.log(`Cycle "${cycle.name}" auto-completed. Incomplete issues moved to backlog.`);
    }

    return expiredCycles.length;
  }
}

export const cycleService = new CycleService();
