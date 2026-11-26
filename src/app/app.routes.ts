import { Routes } from '@angular/router';
//this is the note component
import { NoteComponentComponent } from './components/note-component/note-component.component';

//this is to get the id of a note and its home, leaving it 
//up to the user to start writing  -- to be changed.
export const routes: Routes = [
    {path:'note/:id',component:NoteComponentComponent},
    {path:'',redirectTo:'note/home',pathMatch:'full'}
];
