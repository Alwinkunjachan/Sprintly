import { Sequelize } from 'sequelize';
import { Project, Issue } from '../models';
import { ApiError } from '../utils/api-error';

export class ProjectService {
  async findAll() {
    const projects = await Project.findAll({
      order: [['createdAt', 'DESC']],
      attributes: {
        include: [
          [Sequelize.literal('(SELECT COUNT(*) FROM issues WHERE issues.project_id = "Project"."id")'), 'issueCount'],
        ],
      },
    });
    return projects;
  }

  async findById(id: string) {
    const project = await Project.findByPk(id, {
      attributes: {
        include: [
          [Sequelize.literal('(SELECT COUNT(*) FROM issues WHERE issues.project_id = "Project"."id")'), 'issueCount'],
        ],
      },
    });
    if (!project) throw ApiError.notFound('Project not found');
    return project;
  }

  async create(data: { name: string; identifier: string; description?: string }) {
    return Project.create({
      name: data.name,
      identifier: data.identifier.toUpperCase(),
      description: data.description || null,
    });
  }

  async update(id: string, data: Partial<{ name: string; description: string }>) {
    const project = await this.findById(id);
    return project.update(data);
  }

  async delete(id: string) {
    const project = await this.findById(id);
    await project.destroy();
  }
}

export const projectService = new ProjectService();
