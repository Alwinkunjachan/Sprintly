import { Label } from '../models';
import { ApiError } from '../utils/api-error';

export class LabelService {
  async findAll() {
    return Label.findAll({ order: [['name', 'ASC']] });
  }

  async findById(id: string) {
    const label = await Label.findByPk(id);
    if (!label) throw ApiError.notFound('Label not found');
    return label;
  }

  async create(data: { name: string; color: string }) {
    return Label.create(data);
  }

  async update(id: string, data: Partial<{ name: string; color: string }>) {
    const label = await this.findById(id);
    return label.update(data);
  }

  async delete(id: string) {
    const label = await this.findById(id);
    await label.destroy();
  }
}

export const labelService = new LabelService();
