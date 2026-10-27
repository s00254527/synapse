import { AfterViewInit, Component, ElementRef, model, NgZone,OnDestroy,ViewChild } from '@angular/core';
import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import {yCollab} from 'y-codemirror.next';
import {EditorState} from '@codemirror/state';
import { EditorView,keymap,lineNumbers } from '@codemirror/view';
import {defaultKeymap} from '@codemirror/commands';
import {javascript} from '@codemirror/lang-javascript';
// ^ this above was for the basic text editor and the impoorts to make 
//code mirrior and Yjs work together. Now im adding the markdown. 
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting,indentOnInput,bracketMatchingHandle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { EditorSelection } from '@codemirror/state';
import { drawSelection,highlightActiveLine,placeholder } from '@codemirror/view';
import { yUndoManagerKeymap } from 'y-codemirror.next';

//now i have to define the styling.


@Component({
  selector: 'app-generator',
  standalone:true,
  templateUrl: './generator.html',
  styleUrl: './generator.css',
})
export class Generator implements AfterViewInit, OnDestroy{
  @ViewChild('host',{static:true}) host!:ElementRef<HTMLDivElement>;

  //private vars for the y doc and the websocket
  private ydoc = new Y.Doc();
  private provider?:WebsocketProvider;
  private view?:EditorView;


  //constructor creating a zone. 
  constructor(private zone:NgZone){}


  //this is to keep the cdmr6 and yjs out of the change detection
  //so we can edit text. 

  ngAfterViewInit() {
    //this is to connect to the private websocket, didnt write this down. 
    this.zone.runOutsideAngular(() =>{
      this.provider = new WebsocketProvider('ws://localhost:1234', 'my-room', this.ydoc);
      const ytext = this.ydoc.getText('codemirror');

      this.provider.awareness.setLocalStateField('user',{
        name:'User' + Math.floor(Math.random()*100),
         color: '#30bced',
        colorLight: '#30bced33',        
      });
      //these are for the console logs, to see if the server is running. 
      //the server being i.e. the provider. 
      this.provider.on('status', (e: { status: string }) => {
        console.log('WS status:', e.status);
      });

      this.provider.on('sync', (isSynced: boolean) => {
        console.log('Synced with server:', isSynced);
      });

      this.provider.awareness.on('change', () => {
        console.log('Users online:', this.provider!.awareness.getStates().size);
      });

      //this is creating the editor state, where we are using the extentions 
      //for line numbers and the defualt keymap. 
      const state = EditorState.create({
        doc:ytext.toString(),
        extensions:[
          lineNumbers(),
          keymap.of(defaultKeymap),
          javascript(),
          yCollab(ytext, this.provider.awareness),
        ],
      });
      //making this view the parent state on this pc, we will have to change this in 
      //future, 
      this.view = new EditorView({state, parent: this.host.nativeElement});
    });
  }
  //this will destroy the view and the document, 
  ngOnDestroy(): void {
    this.view?.destroy();
    this.provider?.destroy();
    this.ydoc.destroy();
  }
}
