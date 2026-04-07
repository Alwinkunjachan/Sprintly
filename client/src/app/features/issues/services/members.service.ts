import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Member } from '../../../core/models/member.model';

@Injectable({ providedIn: 'root' })
export class MembersService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Member[]> {
    return this.api.get<Member[]>('/members');
  }
}
