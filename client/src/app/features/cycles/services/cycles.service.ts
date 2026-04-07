import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Cycle, CreateCycleDto } from '../../../core/models/cycle.model';

@Injectable({ providedIn: 'root' })
export class CyclesService {
  constructor(private api: ApiService) {}

  getAll(projectId?: string): Observable<Cycle[]> {
    const params: Record<string, string> = {};
    if (projectId) params['projectId'] = projectId;
    return this.api.get<Cycle[]>('/cycles', params);
  }

  getById(id: string): Observable<Cycle> {
    return this.api.get<Cycle>(`/cycles/${id}`);
  }

  create(data: CreateCycleDto): Observable<Cycle> {
    return this.api.post<Cycle>('/cycles', data);
  }

  update(id: string, data: Partial<CreateCycleDto>): Observable<Cycle> {
    return this.api.patch<Cycle>(`/cycles/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/cycles/${id}`);
  }
}
