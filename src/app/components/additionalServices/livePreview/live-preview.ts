//this additional service is for the text editing and removing additional markdowns 
//around the text on the codemirrior end 
import { EditorSelection,RangeSetBuilder } from "@codemirror/state";
import {Decoration,DecorationSet, EditorView, ViewPlugin,ViewUpdate,WidgetType} from '@codemirror/view';
import { HighlightStyle,ensureSyntaxTree,syntaxTree } from "@codemirror/language";
import {tags as t} from '@lezer/highlight';

//this was my previous code that I was using for the syntax tree
export const markDownStyle = HighlightStyle.define([
  { tag: t.heading1, fontSize: '2em', fontWeight: 'bold' },
  { tag: t.heading2, fontSize: '1.6em', fontWeight: 'bold' },
  { tag: t.heading3, fontSize: '1.3em', fontWeight: 'bold' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, textDecoration: 'underline' },
  { tag: t.monospace, fontFamily: 'monospace' },
]);

//this is the srawp selection in a marker section
export const wrapSelection = (mark:string) => (view:EditorView):Boolean =>{
    view.dispatch(
        //this is changing the range between the sections of text from the 
        //incertion to the ending 
        view.state.changeByRange(range =>({
            changes:[
                {from:range.from, insert:mark},
                {from:range.to,insert:mark}
            ],
            range:EditorSelection.range(range.from + mark.length, range.to + mark.length),
        })),
    )
    return true; 
};

//this is for the live preview 
//hidden marks from the previous code 
const HIDDEN_MARKS = new Set([
  'HeaderMark',        // #
  'EmphasisMark',      // * _
  'StrikethroughMark', // ~
  'QuoteMark',         // >
  'CodeMark',          // `
]);

// This is for overriding the dom with the bullet widget class
class BulletWidget extends WidgetType{
    toDOM(){
        const span = document.createElement('span');
        span.className = 'cm-bullet';
        span.textContent = '•';
        return span;
    }
    override eq() {return true;}
}

//this is now for hiding marks and editing the dom like the bullet widget 
const hideMark = Decoration.replace({});
const bulletMark = Decoration.replace({widget: new BulletWidget()});

function buildDecorations(view:EditorView):DecorationSet{
     const { state } = view;
  const builder = new RangeSetBuilder<Decoration>();
  const tree = ensureSyntaxTree(state, view.viewport.to, 50) ?? syntaxTree(state);

    //lines touched by the couror stay raw so they can be edited 
    const activeLines = new Set<number>();
    for(const r of state.selection.ranges){
        //this is getting the line of the selection range from first to last, 
        //this is in case someone selectes mutiple lines
        const first = state.doc.lineAt(r.from).number;
        const last = state.doc.lineAt(r.to).number;

        //updates the active lines via a loop 
        for(let n = first; n <= last;n++){
            activeLines.add(n);
        }
    }

    for(const {from,to} of view.visibleRanges){
        tree.iterate({
            from,
            to,
            enter:node =>{
                const isListMark = node.name === 'ListMark';

                if(!isListMark && !HIDDEN_MARKS.has(node.name)){
                    return;
                }

             // only hide inline-code backticks, not fenced-block fences
        if (node.name === 'CodeMark' && node.node.parent?.name !== 'InlineCode') {
            return
        };

        if (isListMark) {
          if (node.node.parent?.parent?.name !== 'BulletList'){
           return; // skip "1."
          }
          builder.add(node.from, node.to, bulletMark);
          return;
        }

        // also swallow the space after "#" and ">"
        let end = node.to;
        if (
          (node.name === 'HeaderMark' || node.name === 'QuoteMark') &&
          state.doc.sliceString(end, end + 1) === ' '
        ) end += 1;

        builder.add(node.from, end, hideMark);
      },
    });
  }
  return builder.finish();
}

export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = buildDecorations(view); }
    update(u: ViewUpdate) {
      if (
        u.docChanged || u.selectionSet || u.viewportChanged ||
        syntaxTree(u.startState) !== syntaxTree(u.state)
      ) this.decorations = buildDecorations(u.view);
    }
  },
  { decorations: p => p.decorations },
);

