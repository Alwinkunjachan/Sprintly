import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Label, CreateLabelDto } from '../../../core/models/label.model';

@Injectable({ providedIn: 'root' })
export class LabelsService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Label[]> {
    return this.api.get<Label[]>('/labels');
  }

  create(data: CreateLabelDto): Observable<Label> {
    return this.api.post<Label>('/labels', data);
  }

  update(id: string, data: Partial<CreateLabelDto>): Observable<Label> {
    return this.api.patch<Label>(`/labels/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/labels/${id}`);
  }
}
