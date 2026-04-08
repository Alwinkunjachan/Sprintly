import { Label } from './label.model';
import { Member } from './member.model';
import { Project } from './project.model';

export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'ready_to_test' | 'testing_in_progress' | 'done' | 'cancelled';
export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface Issue {
  id: string;
  identifier: string;
  number: number;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  projectId: string;
  assigneeId: string | null;
  cycleId: string | null;
  project?: Project;
  assignee?: Member | null;
  labels?: Label[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueDto {
  title: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  projectId: string;
  assigneeId?: string | null;
  cycleId?: string | null;
  labelIds?: string[];
}

export interface IssueFilters {
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  cycleId?: string;
  labelId?: string;
  search?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
  page?: string;
  pageSize?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const ISSUE_STATUSES: { value: IssueStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready_to_test', label: 'Ready to Test' },
  { value: 'testing_in_progress', label: 'Testing in Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const ISSUE_PRIORITIES: { value: IssuePriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'none', label: 'No priority' },
];
