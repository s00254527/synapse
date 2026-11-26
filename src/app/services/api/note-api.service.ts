import { Injectable,inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NoteModel as ApiNote } from '../../model/noteModel';
@Injectable({
  providedIn: 'root'
})
export class NoteApiService {
  private http = inject(HttpClient);
  private base = '/api/notes'; // <- change to your API
  //getting the id of the doc that we pull into a new route.
  get(id: string) {
    return this.http.get<ApiNote>(`${this.base}/${id}`);
    // if your API returns NoteModel: .pipe(map(n => ({ id: n.id, title: n.Title, content: n.Contenet })))
  }
//saving the text doc - codemirrior for the applicaiton
  save(id: string, content: string) {
    return this.http.put<void>(`${this.base}/${id}`, { content });
  }
  //creating a new note 
  create(title: string) {
    return this.http.post<ApiNote>(this.base, { title, content: '' });
}
}
