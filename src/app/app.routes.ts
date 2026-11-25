import { Routes } from '@angular/router';
//this is the note component
import { NoteComponentComponent } from './components/note-component/note-component.component';

export const routes: Routes = [
    {path:'note/:id',component:NoteComponentComponent},
    {path:'',redirectTo:'note/home',pathMatch:'full'}
];
