//so this is all of the angular imports that I need to get 
import { AfterViewInit,Component, ElementRef, NgZone, OnDestroy,viewChild,ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {Subscription,firstValueFrom } from 'rxjs';

//now for the yjs imports 
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';

//these are all of the code mirrior imports 
import { EditorState } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers, placeholder} from '@codemirror/view';
import { defaultKeymap,indentWithTab} from '@codemirror/commands';
import { markdown,markdownLanguage} from '@codemirror/lang-markdown';
import { bracketMatching,indentOnInput,syntaxHighlighting } from '@codemirror/language';
import { autocompletion,closeBrackets,closeBracketsKeymap} from '@codemirror/autocomplete';

//these are the additional componets that I need to import 
import { livePreview,markDownStyle,wrapSelection } from '../additionalServices/livePreview/live-preview';
import { extractLinks,wikiCompletion,wikiLinks } from '../additionalServices/wikilinks/wikilinks';
import { NoteApiService } from '../../services/api/note-api.service';
import { NoteServiceService,WS_URL } from '../../services/notes/note-service.service';

//fun fn after 'ms' of quiet flush() runs it now if pending 
function debounce(fn:()=>void,ms:number){
  let t:ReturnType<typeof setTimeout> | undefined;
  const d = () =>{
    clearTimeout(t);
    t = setTimeout(() => {t = undefined; fn();},ms);
  };
  d.flush = ()=> {if (t){clearTimeout(t);t=undefined; fn();}};
  return d;
}


@Component({
  selector: 'app-note-component',
  standalone: true,
  imports: [],
  templateUrl: './note-component.component.html',
  styleUrl: './note-component.component.css'
})

export class NoteComponentComponent implements AfterViewInit,OnDestroy{

@ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;


private ydoc?: Y.Doc;
private provider?:WebsocketProvider;
private view?:EditorView;
private sub?:Subscription;
private flushPending?:() => void;

constructor(
  private zone:NgZone,
  private router:Router,
  private route:ActivatedRoute,
  private notes:NoteServiceService,
  private api:NoteApiService
){}

//this is the initialisaiton method to subscribe to the api 
ngAfterViewInit() {
  //the same component instance is resused when :id changes, so subscribe 
  this.sub = this.route.paramMap.subscribe(p=> this.mount(p.get('id')!));
}
//this is the destroy mehod 
  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.teardown();
  }
private teardown(){
  this.flushPending?.();//ensuring that you dont loose the last edits 
  this.flushPending = undefined;
  this.view?.destroy();
  this.ydoc?.destroy();
  this.view = this.provider = this.ydoc = undefined;
}
private mount(id:string){
  this.teardown();

  //this is to keep codemirrior and yjs out of angualrs change detection
  this.zone.runOutsideAngular(() =>{
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(WS_URL,`note-${id}`,ydoc);
    this.ydoc = ydoc;
    this.provider = provider;

    const ytext = ydoc.getText('codemirror');
    const meta = ydoc.getMap('meta');

    provider.awareness.setLocalStateField('user',{
      name: 'User' + Math.floor(Math.random()*100),
      color:'#30bced',
      colorLight:'#30bced33',
    });

    //this is to load the apiu and seed the y doc once the room has synced
    const note$ = firstValueFrom(this.api.get(id));
    note$.catch(() => {}); //handled below; avoids early unhandled rejection

    const onSync = async (synced:boolean) =>{
      if(!synced) return;
      provider.off('sync',onSync);
      try{
        const note = await note$;
        if(this.ydoc !== ydoc) return;
        await this.notes.ensureIndexed({id,title:note.title,content:note.content});
        if(this.ydoc !== ydoc) return;
         if (meta.get('seeded') || ytext.length > 0) return;  // if the room already has content 
         ydoc.transact(()=>{
          ytext.insert(0,note.content);
          meta.set('seeded',true);
         },'seed');
      }catch(e){
        console.error('Failed to load note',e);
      }
    };
    provider.on('sync',onSync);

//save to the api + publish the links debounced etc 
   // ---- save to API + publish [[links]] (debounced) ----
      const save = debounce(
        () => this.api.save(id, ytext.toString()).subscribe({ error: e => console.error('Save failed', e) }),
        1500,
      );
      const publishLinks = debounce(
        () => this.notes.setLinks(id, extractLinks(ytext.toString())),
        500,
      );
      this.flushPending = () => { save.flush(); publishLinks.flush(); };

      ytext.observe((_event, tr) => {
        publishLinks();
        // save only our own edits (not remote ones, not the initial seed)
        if (tr.local && tr.origin !== 'seed') save();
      });

      //this is the editor section 
      const state = EditorState.create({
        doc: ytext.toString(),
        extensions: [
          lineNumbers(),
          drawSelection(),
          highlightActiveLine(),
          indentOnInput(),
          bracketMatching(),
          EditorView.lineWrapping,
          placeholder('start new note...'),

          markdown({ base: markdownLanguage }),
          syntaxHighlighting(markDownStyle),
          livePreview,

          wikiLinks(async target => {
            try {
              const targetId = await this.notes.openByTitle(target);
              this.zone.run(() => this.router.navigate(['/note', targetId]));
            } catch (e) {
              console.error('Could not open link', e);
            }
          }),
          closeBrackets(),
          autocompletion({ override: [wikiCompletion(() => this.notes.titles())] }),

          keymap.of([
            { key: 'Mod-b', run: view => !!wrapSelection('**')(view) },
            { key: 'Mod-i', run:view => !!wrapSelection('*')(view) },
            ...closeBracketsKeymap,
            ...yUndoManagerKeymap, // collaborative undo (only undoes YOUR changes)
            indentWithTab,
            ...defaultKeymap,
          ]),

          yCollab(ytext, provider.awareness),
        ],
      });

      this.view = new EditorView({ state, parent: this.host.nativeElement });
  });
}

}
