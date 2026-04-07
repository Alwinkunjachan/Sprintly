export interface Project {
  id: string;
  name: string;
  identifier: string;
  description: string | null;
  issueCounter: number;
  issueCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  identifier: string;
  description?: string;
}
