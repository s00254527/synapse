import { AfterViewInit, Component, ElementRef, model, NgZone,OnDestroy,ViewChild } from '@angular/core';
import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import {yCollab} from 'y-codemirror.next';
import {EditorState, RangeSetBuilder} from '@codemirror/state';
import { EditorView,keymap,lineNumbers } from '@codemirror/view';
import {defaultKeymap, indentWithTab} from '@codemirror/commands';
// ^ this above was for the basic text editor and the impoorts to make 
//code mirrior and Yjs work together. Now im adding the markdown. 
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting,indentOnInput,bracketMatching, ensureSyntaxTree } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { EditorSelection } from '@codemirror/state';
import { drawSelection,highlightActiveLine,placeholder,Decoration, DecorationSet,ViewPlugin,ViewUpdate,WidgetType } from '@codemirror/view';
import { yUndoManagerKeymap } from 'y-codemirror.next';

//here are some more features im throwing into this. 
import{searchKeymap} from '@codemirror/search';
import {CompletionContext,autocompletion,closeBrackets } from '@codemirror/autocomplete';
import { foldKeymap,syntaxTree } from '@codemirror/language';


//here are some more imports for melicinious items 
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NoteServiceService } from '../services/note-service.service';


// [[Note]] or [[Note|alias]]
const WIKILINK = /\[\[([^\[\]\n|]+)(?:\|([^\[\]\n]+))?\]\]/g;
const hide = Decoration.replace({})

//now i have to define the styling. so that this can edit certian stages of syntax
const markDownStyle = HighlightStyle.define([
  { tag: t.heading1, fontSize: '2em',   fontWeight: 'bold' },
  { tag: t.heading2, fontSize: '1.6em', fontWeight: 'bold' },
  { tag: t.heading3, fontSize: '1.3em', fontWeight: 'bold' },
  { tag: t.strong,        fontWeight: 'bold' },
  { tag: t.emphasis,      fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link,          textDecoration: 'underline' },
  { tag: t.monospace,     fontFamily: 'monospace' },
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
//this is to replace the -
const hideMark = Decoration.replace({});
const bulletMark = Decoration.replace({widget: new BulletWidget()});//replacing it with the ullet widget 

//creating a new set of build declorations for the state view 
function buildDecorations(view:EditorView):DecorationSet{
  const {state} = view;
  const builder = new RangeSetBuilder<Decoration>();

//this is for the ensurance for the syntax tree. 
const tree = ensureSyntaxTree(state,view.viewport.to,50)?? syntaxTree(state);


// Trying to create "raw" lines so the user can see the text they are typing, but not the markdown symbols.
const activeLines = new Set<number>();
for(const range of state.selection.ranges){
  const first = state.doc.lineAt(range.from).number;
  const last = state.doc.lineAt(range.to).number;
  for(let n = first; n<= last; n++){
    activeLines.add(n);
  }
}
//iterating through the state of visable ranges from => to
  for (const {from, to} of view.visibleRanges){
    tree.iterate({
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
  return builder.finish();
}
//these are the live updates that happen when the user is typing and changing the text.
export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    //updating the view on the syntax tree, 
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
  {decorations:(Plugin) => Plugin.decorations},
);

//this class is to determine the code and treating it as a link
function inCode(state:EditorState,pos:number):boolean{
  //resolving the code changes for certian thigns based on its position to the parent line
  for(let n:any = syntaxTree(state).resolveInner(pos,1);n; n =n.parent){
    if(n.name === 'InlineCode' || n.name === 'FencedCode' || n.name === 'CodeBlock') return true;
  }
  return false;
}
//this function si to build the wikilinks 
function buildWikiLinks(view:EditorView):DecorationSet{
  const {state} = view;
  const builder = new RangeSetBuilder<Decoration>();
//creating another from -> to for the visable rnages for hte wikilinks 
  for(const {from,to} of view.visibleRanges){
    const text = state.doc.sliceString(from,to);
    WIKILINK.lastIndex = 0;
    let m: RegExpExecArray | null;

    while((m = WIKILINK.exec(text))){
      const start = from + m.index;
      const end = start + m[0]?.length;

      if(inCode(state,start)) continue;

      //coursor is touching the link, leaving it raw so it can be changed

      if(state.selection.ranges.some(r => r.from <= end && r.to >= start)) continue;

      const target = (m[1] ?? '').trim();
      //this is to skip | if inptutted
      const labelStart = m[2] ? start + 2 + m[1]?.length + 1: start + 2;
      const labelEnd = end -2;

      //this hides the "[[ and | if ailised"
      builder.add(start,labelStart,hide);
      builder.add(labelStart,labelEnd,Decoration.mark({
         class:'cm-wikilink',
         attribute :{'data-target':target},
      }));
     builder.add(labelEnd,end,hide); // this hides the "]]"
      
    }
  }
  return builder.finish();
}
//this is ot alows hte wikilinks to gain targets and dress 
//them appropirately
export const wikiLinks = (onOpen:(target:string)=> void) => [
  ViewPlugin.fromClass(
    class{
      decorations:DecorationSet;
      constructor(view:EditorView){this.decorations = buildWikiLinks(view)};
      update(u:ViewUpdate){
        if(u.docChanged || u.selectionSet || u.viewportChanged){
          this.decorations = buildWikiLinks(u.view);
        }
      }
    },
    {decorations: p => p.decorations},
  ),
  //this is for the mousedown event that is taking place, 
  EditorView.domEventHandlers({
    mousedown(event){
      const el = (event.target as HTMLElement).closest('.cm-wikilink') as HTMLElement| null;
      //CTRL/CMD + Click opens. PLain texxt just placed the courser so it can be edited
      if(el  && (event.ctrlKey || event.metaKey)){
        event.preventDefault();
        event.preventDefault();
        onOpen(el.dataset['target']!);
        return true;
      }
      return false;
    },
  }),
  //base theme not generator.css because codemorriors dom is created outside
  //angualrs template so component scoped css wont reach it, hence this styling 

  EditorView.baseTheme({
    '.cm-wikilink': { color: '#7c3aed', textDecoration: 'underline', cursor: 'pointer' },
  }),
];

const wikiCompletion = (getNotes:() => string[]) =>(ctx:CompletionContext) =>{
  const m = ctx.matchBefore(/\[\[[^\]\n]*/);
  if(!m) return null;
    return{
      from : m.from + 2,
      options: getNotes().map(label => ({label,type:'text'})),
      validFor:/^[^\]\n]*$/,
    };
  };



@Component({
  selector: 'app-generator',
  standalone:true,
  imports:[],
  templateUrl: './note-component.html',
  styleUrl: './note-component.css',
})
export class Generator implements AfterViewInit, OnDestroy{
  @ViewChild('host',{static:true}) host!:ElementRef<HTMLDivElement>;

  //private vars for the y doc and the websocket
  private ydoc = new Y.Doc();
  private provider?:WebsocketProvider;
  private view?:EditorView;
  //to see if nay of the notes have been linked before 
  private sub?:Subscription;
  noteTitles: string[] = [];


  //constructor creating a zone. 
  //and using all of the routing and servies
  constructor(
    private zone:NgZone,
     private router:Router,
    private route:ActivatedRoute,
    private notes:NoteServiceService 
){}


  //this is to keep the cdmr6 and yjs out of the change detection
  //so we can edit text. 

  ngAfterViewInit() {
    this.sub = this.route.paramMap.subscribe(p => this.mount(p.get('id')!));
  }

  //creating a private teardown to destroy the note when gone to the next one 
  private teardown(){
    this.view?.destroy();
    this.provider?.destroy();
    this.ydoc?.destroy();
  }

  private mount(id:string){
    this.teardown();
    this.zone.runOutsideAngular(() =>{
      this.ydoc = new Y.Doc();
      //implemeting the note id as the websocketProvider for the route
       this.provider = new WebsocketProvider('ws://localhost:1234', `note-${id}`, this.ydoc);
       const ytext = this.ydoc.getText('codemirror');

     //this is jus to create a random user, 
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
          //this import is for the wikilinks
          wikiLinks(target => this.zone.run(() => this.router.navigate(['/note', target]))),
          closeBrackets(),
          autocompletion({override:[wikiCompletion(()=>this.noteTitles)]}),

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
