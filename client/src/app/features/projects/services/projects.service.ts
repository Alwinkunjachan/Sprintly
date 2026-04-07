import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Project, CreateProjectDto } from '../../../core/models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Project[]> {
    return this.api.get<Project[]>('/projects');
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
