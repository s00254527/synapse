import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NoteModel } from '../../model/noteModel';

interface ApiNote {
  noteId: number;
  vaultId: number;
  folderId?: number | null;
  title: string;
  content?: string | null;
  isDeleted?: boolean | null;
}

const toModel = (n: ApiNote): NoteModel => ({
  id: String(n.noteId),
  title: n.title,
  content: n.content ?? '',
  FolderId: n.folderId ?? undefined,
  IsDeleted: n.isDeleted ?? undefined,
});

@Injectable({ providedIn: 'root' })
export class NoteApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/notes`;

  get(id: string) {
    return this.http.get<ApiNote>(`${this.base}/${id}`).pipe(map(toModel));
  }

  save(id: string, title: string, content: string) {
    return this.http.put<void>(`${this.base}/${id}`, { title, content });
  }

  create(title: string) {
    return this.http
      .post<ApiNote>(this.base, { title, content: '', vaultId: environment.defaultVaultId })
      .pipe(map(toModel));
  }
}