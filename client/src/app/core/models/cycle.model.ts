import { Issue } from './issue.model';
import { Project } from './project.model';

export interface Cycle {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed';
  projectId: string;
  project?: Project;
  issues?: Issue[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCycleDto {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status?: string;
  projectId: string;
}
