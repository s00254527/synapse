import { Injectable,signal } from '@angular/core';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { NoteModel } from '../model/noteModel';


@Injectable({
  providedIn: 'root'
})
export class NoteServiceService {
  private ydoc = new Y.Doc();
  private provider = new WebsocketProvider('ws://localhost:1234','workspace-index',this.ydoc);
  private notes = this.ydoc.getMap<NoteModel>('notes');
//creating the inptted signal for the noteModel
readonly list = signal<NoteModel[]>([]);


//resolves once the index has loaded from the server
readonly ready = new Promise<void>(res =>{
  this.provider.once('sync',()=> res());
});

  constructor() {
    this.notes.observe(()=>this.list.set([...this.notes.values()].filter(n => !n.IsDeleted)));
   }

   //getting the note by the title 
findByTitle(title:string) :NoteModel | undefined{
  const t = title.trim().toLocaleLowerCase();
  //trimming the note title and returning it to lowercase
  return this.list().find(n => n.Title.toLowerCase() === t);
}


//creating notes 
  create(title: string): NoteModel {
    
    const note :NoteModel ={
      NoteId:crypto.randomUUID(),
      Title:title.trim(),
      FolderId: 1,
      UpdatedAt:new Date(),
     
    }
    this.notes.set(note.NoteId, note);
    return note;
  }
  //this creates a new note if there isint one linked in the notes

  async openByTitle(title:string):Promise<string>{
    await this.ready;
    return (this.findByTitle(title)?? this.create(title)).NoteId;
  }

}
