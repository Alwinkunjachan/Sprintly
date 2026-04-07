import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Issue, CreateIssueDto, IssueFilters } from '../../../core/models/issue.model';

@Injectable({ providedIn: 'root' })
export class IssuesService {
  constructor(private api: ApiService) {}

  getAll(filters?: IssueFilters): Observable<Issue[]> {
    return this.api.get<Issue[]>('/issues', filters as any);
  }

  getById(id: string): Observable<Issue> {
    return this.api.get<Issue>(`/issues/${id}`);
  }

  create(data: CreateIssueDto): Observable<Issue> {
    return this.api.post<Issue>('/issues', data);
  }

  update(id: string, data: Partial<CreateIssueDto>): Observable<Issue> {
    return this.api.patch<Issue>(`/issues/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/issues/${id}`);
  }
}
