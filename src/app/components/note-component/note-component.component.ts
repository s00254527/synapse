//so this is all of the angular imports that I need to get 
import { AfterViewInit,Component, ElementRef, NgZone, OnDestroy,ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {Subscription,firstValueFrom } from 'rxjs';

//now for the yjs imports 
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

//these are all of the code mirrior imports 
import { EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers, placeholder} from '@codemirror/view';
import { defaultKeymap,indentWithTab} from '@codemirror/commands';
import { markdown,markdownLanguage} from '@codemirror/lang-markdown';
import { bracketMatching,indentOnInput,syntaxHighlighting } from '@codemirror/language';
import { autocompletion,closeBrackets,closeBracketsKeymap} from '@codemirror/autocomplete';

//

@Component({
  selector: 'app-note-component',
  standalone: true,
  imports: [],
  templateUrl: './note-component.component.html',
  styleUrl: './note-component.component.css'
})
export class NoteComponentComponent {

}
