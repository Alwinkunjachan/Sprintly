import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Project, CreateProjectDto } from '../../../core/models/project.model';
import { PaginatedResponse } from '../../../core/models/issue.model';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Project[]> {
    return this.api.get<Project[]>('/projects');
  }

  getAllPaginated(page: number, pageSize: number): Observable<PaginatedResponse<Project>> {
    return this.api.get<PaginatedResponse<Project>>('/projects', {
      page: String(page),
      pageSize: String(pageSize),
    });
  }

  getById(id: string): Observable<Project> {
    return this.api.get<Project>(`/projects/${id}`);
  }

  create(data: CreateProjectDto): Observable<Project> {
    return this.api.post<Project>('/projects', data);
  }

  update(id: string, data: Partial<CreateProjectDto>): Observable<Project> {
    return this.api.patch<Project>(`/projects/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/projects/${id}`);
  }
}
