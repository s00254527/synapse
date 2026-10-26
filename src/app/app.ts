import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Generator } from './generator/generator';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,Generator],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('synapse');
}
