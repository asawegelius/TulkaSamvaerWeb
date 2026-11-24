import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { ApiSchemas } from '../api';
import { ApiUrlService } from '../http/api-url.service';

export type Me = ApiSchemas['Me'];
export type Group = ApiSchemas['Group'];
export type MemberRef = ApiSchemas['MemberRef'];

/** Platform endpoints every section uses: the current member, their groups and the member list. */
@Injectable({ providedIn: 'root' })
export class PlatformApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  getMe(): Observable<Me> {
    return this.http.get<Me>(this.apiUrl.create('api/v1/me'));
  }

  listMyGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(this.apiUrl.create('api/v1/me/groups'));
  }

  listMembers(): Observable<MemberRef[]> {
    return this.http.get<MemberRef[]>(this.apiUrl.create('api/v1/members'));
  }
}
