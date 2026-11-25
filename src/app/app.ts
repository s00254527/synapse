import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NoteComponentComponent } from './components/note-component/note-component.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,NoteComponentComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('synapse');
}
