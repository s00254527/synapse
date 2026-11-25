import { Routes } from '@angular/router';
//this is the note component
import { Generator } from './generator/note-component';

export const routes: Routes = [
    {path:'note/:id',component:Generator},
    {path:'',redirectTo:'note/home',pathMatch:'full'}
];
