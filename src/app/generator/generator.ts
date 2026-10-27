import { AfterViewInit, Component, ElementRef, model, NgZone,OnDestroy,ViewChild } from '@angular/core';
import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import {yCollab} from 'y-codemirror.next';
import {EditorState} from '@codemirror/state';
import { EditorView,keymap,lineNumbers } from '@codemirror/view';
import {defaultKeymap, indentWithTab} from '@codemirror/commands';
import {javascript} from '@codemirror/lang-javascript';
// ^ this above was for the basic text editor and the impoorts to make 
//code mirrior and Yjs work together. Now im adding the markdown. 
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting,indentOnInput,bracketMatching } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { EditorSelection } from '@codemirror/state';
import { drawSelection,highlightActiveLine,placeholder } from '@codemirror/view';
import { yUndoManagerKeymap } from 'y-codemirror.next';

//here are some more features im throwing into this. 
import{searchKeymap} from '@codemirror/search';
import {autocompletion,closeBrackets } from '@codemirror/autocomplete';
import { foldKeymap } from '@codemirror/language';


///importing these so I can hide the # or the * when the user implements them. 
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet,ViewPlugin,ViewUpdate,WidgetType } from '@codemirror/view';


//now i have to define the styling.
const markDownStyle = HighlightStyle.define([
  {tag: t.heading1, fontSize:'2em',fontWeight:'bold'},
  {tag: t.heading2, fontSize:'1.6em',fontWeight:'bold'},
  {tag: t.heading3, fontSize:'1.3em',fontWeight:'bold'},
  {tag: t.strong,fontWeight:'bold'},
  {tag: t.emphasis,fontWeight:'italic'},
  {tag: t.strikethrough,fontWeight:'line-through'},
  {tag: t.link,fontWeight:'underline'},
  {tag: t.monospace,fontWeight:'monospace'},

]);

//creating the content markers like # for heading.
//its a true or false if its active or not on na certian piece of text.
const wrapSelection = (mark:string) => (view:EditorView):boolean =>{
  const textRange = view.state.changeByRange(range =>({
    //defining where to start the change based off of the marking.
    changes:[
      {from:range.from, insert:mark},
      {from:range.to,insert:mark},
    ],
    //this is defining the state from the beiginning mark to the ending one 
    range: EditorSelection.range(range.from + mark.length, range.to + mark.length),
  }));

  return true;
};


//hiding these marks, based off of the imputs and everything elese
const HIDDEN_MARKS = new Set([
  'HeaderMark', // #
  'EmphasisMark', // *
  'StrikethroughMark', // ~
  'QuoteMark', // >
  'CodeMark', // `
]);

class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-bullet';
    span.textContent = '•';
    return span;
  }
  override eq() { return true; }
}
const hideMark = Decoration.replace({});
const bulletMark = Decoration.replace({widget: new BulletWidget()});

function buildDecorations(view:EditorView):DecorationSet{
  const {state} = view;
  const builder = new RangeSetBuilder<Decoration>();

// Trying to create "raw" lines. 
const activeLines = new Set<number>();
for(const range of state.selection.ranges){
  const first = state.doc.lineAt(range.from).number;
  const last = state.doc.lineAt(range.to).number;
  for(let n = first; n<= last; n++){
    activeLines.add(n);
  }

  for (const {from, to} of view.visibleRanges){
    syntaxTree(state).iterate({
      from,
      to,
      enter:(node) =>{
        //so its none of the active lines or no active list marks then ignore it 
        const isListMark = node.name === 'ListMark';
        if(!isListMark && !HIDDEN_MARKS.has(node.name))
           return;

        //if the coursor is on the line leave the text visable.
        if(activeLines.has(state.doc.lineAt(node.from).number)) 
          return;

        //if only hide backticks not fenced code block fences
        if(node.name === 'CodeMark' && node.node.parent?.name != 'InlineCode')
          return;
        
        if (isListMark) {
          // Only bullet lists, not "1." numbered ones
          if (node.node.parent?.parent?.name !== 'BulletList') return;
          builder.add(node.from, node.to, bulletMark);
          return;
        }
        // Also swallow the space after # and > so headings align properly
        let end = node.to;
        if (
          (node.name === 'HeaderMark' || node.name === 'QuoteMark') &&
          state.doc.sliceString(end, end + 1) === ' '
        ) {
          end += 1;
        }
         builder.add(node.from, end, hideMark);
      },
    });
  }
}
  return builder.finish();
}

export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);



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
          //now adding in the text editor extensions bar keymap and the 
          //line numbers
          drawSelection(),
          highlightActiveLine(),
          indentOnInput(),
          bracketMatching(),  
          EditorView.lineWrapping,
          placeholder('start new note...'),

          //Other code mirror features to go here.... 
          

          //this section replaceds javascript
          markdown({base: markdownLanguage}),
          syntaxHighlighting(markDownStyle),
          livePreview,
          //implementing the undo redo, was shown it had problems. 
          keymap.of([
           
            {key:'Mod-b', run:wrapSelection('**')},
            {key:'Mod-i', run:wrapSelection('*')},
             //these are must have obsidain features
            ...yUndoManagerKeymap,
            indentWithTab,
            ...defaultKeymap,
          ]),
            //making the collab aware of all of this. 
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
