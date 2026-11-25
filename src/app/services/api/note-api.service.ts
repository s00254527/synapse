import { Injectable,inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NoteModel as ApiNote } from '../../model/noteModel';
@Injectable({
  providedIn: 'root'
})
export class NoteApiService {

   private http = inject(HttpClient);
  private base = '/api/notes'; // <- change to your API

  get(id: string) {
    return this.http.get<ApiNote>(`${this.base}/${id}`);
    // if your API returns NoteModel: .pipe(map(n => ({ id: n.id, title: n.Title, content: n.Contenet })))
  }

  save(id: string, content: string) {
    return this.http.put<void>(`${this.base}/${id}`, { content });
  }

  create(title: string) {
    return this.http.post<ApiNote>(this.base, { title, content: '' });
}
}
