import { AfterViewInit, Component, ElementRef, NgZone,OnDestroy,ViewChild } from '@angular/core';
import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import {yCollab} from 'y-codemirror.next';
import {EditorState} from '@codemirror/state';
import { EditorView,keymap,lineNumbers } from '@codemirror/view';
import {defaultKeymap} from '@codemirror/commands';
import {javascript} from '@codemirror/lang-javascript';


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


  //constructor
  constructor(private zone:NgZone){}


  //this is to keep the cdmr6 and yjs out of the change detection
  //so we can edit files n shite 

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() =>{
      this.provider = new WebsocketProvider('ws://localhost:1234', 'my-room', this.ydoc);
      const ytext = this.ydoc.getText('codemirror');

      this.provider.awareness.setLocalStateField('user',{
        name:'User' + Math.floor(Math.random()*100),
         color: '#30bced',
        colorLight: '#30bced33',
      });

      const state = EditorState.create({
        doc:ytext.toString(),
        extensions:[
          lineNumbers(),
          keymap.of(defaultKeymap),
          javascript(),
          yCollab(ytext, this.provider.awareness),
        ],
      });
   
      this.view = new EditorView({state, parent: this.host.nativeElement});
    });
  }
  ngOnDestroy(): void {
    this.view?.destroy();
    this.provider?.destroy();
    this.ydoc.destroy();
  }
}
