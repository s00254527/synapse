//this is for the linking between notes 
import { EditorState,RangeSetBuilder } from "@codemirror/state";
import {Decoration,DecorationSet,EditorView,ViewPlugin,ViewUpdate} from '@codemirror/view';
import { syntaxTree } from "@codemirror/language";
import { CompletionContext } from '@codemirror/autocomplete';

//[[Note]]  this is regex
export const WIKILINK = /\[\[([^\[\]\n|]+)(?:\|([^\[\]\n]+))?\]\]/g;

/** Unique, sorted link targets in a piece of text (used for backlinks/graph). */
export function extractLinks(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(WIKILINK)) out.add((m[1] ?? '').trim());
  return [...out].filter(Boolean).sort();
}

const hide = Decoration.replace({});

function inCode(state: EditorState, pos: number): boolean {
  for (let n: any = syntaxTree(state).resolveInner(pos, 1); n; n = n.parent) {
    if (n.name === 'InlineCode' || n.name === 'FencedCode' || n.name === 'CodeBlock') return true;
  }
  return false;
}

function buildWikiLinks(view: EditorView): DecorationSet {
  const { state } = view;
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    const text = state.doc.sliceString(from, to);
    WIKILINK.lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = WIKILINK.exec(text))) {
      const start = from + m.index;
      const end = start + m[0].length;
      if (inCode(state, start)) continue;

      // cursor touching the link -> leave it raw so it can be edited
      if (state.selection.ranges.some(r => r.from <= end && r.to >= start)) continue;

      const raw = m[1] ?? '';
      const labelStart = m[2] ? start + 2 + raw.length + 1 : start + 2; // skip "Note|" if aliased
      const labelEnd = end - 2;

      builder.add(start, labelStart, hide); // "[[" (and "Note|")
      builder.add(labelStart, labelEnd, Decoration.mark({
        class: 'cm-wikilink',
        attributes: { 'data-target': raw.trim() },
      }));
      builder.add(labelEnd, end, hide);     // "]]"
    }
  }
  return builder.finish();
}

/** Renders [[links]] and makes Ctrl/Cmd+click call onOpen(target). */
export const wikiLinks = (onOpen: (target: string) => void) => [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) { this.decorations = buildWikiLinks(view); }
      update(u: ViewUpdate) {
        if (u.docChanged || u.selectionSet || u.viewportChanged) {
          this.decorations = buildWikiLinks(u.view);
        }
      }
    },
    { decorations: p => p.decorations },
  ),

  EditorView.domEventHandlers({
    mousedown(event) {
      const el = (event.target as HTMLElement).closest('.cm-wikilink') as HTMLElement | null;
      if (el && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        onOpen(el.dataset['target']!);
        return true;
      }
      return false;
    },
  }),

  // baseTheme (not component CSS): CodeMirror's DOM is outside Angular's template
  EditorView.baseTheme({
    '.cm-wikilink': { color: '#7c3aed', textDecoration: 'underline', cursor: 'pointer' },
  }),
];

/** Suggest note titles after typing "[[". */
export const wikiCompletion = (getTitles: () => string[]) => (ctx: CompletionContext) => {
  const m = ctx.matchBefore(/\[\[[^\]\n]*/);
  if (!m) return null;
  return {
    from: m.from + 2,
    options: getTitles().map(label => ({ label, type: 'text' })),
    validFor: /^[^\]\n]*$/,
  };
};