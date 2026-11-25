import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { NoteApiService } from '../api/note-api.service';
import { NoteModel as NoteMeta } from '../../model/noteModel';

export const WS_URL = 'ws://localhost:1234';


@Injectable({
  providedIn: 'root'
})
export class NoteServiceService {
 private ydoc = new Y.Doc();
  private provider = new WebsocketProvider(WS_URL, 'workspace-index', this.ydoc);
  private notes = this.ydoc.getMap<NoteMeta>('notes');
  private linkMap = this.ydoc.getMap<string[]>('links');

  readonly list = signal<NoteMeta[]>([]);
  readonly links = signal<Record<string, string[]>>({});

  /** Resolves once the index has synced (avoids creating duplicates too early). */
  readonly ready = new Promise<void>(resolve => {
    const onSync = (synced: boolean) => {
      if (!synced) return;
      this.provider.off('sync', onSync);
      resolve();
    };
    this.provider.on('sync', onSync);
  });

  constructor(private api: NoteApiService) {
    this.notes.observe(() => this.list.set([...this.notes.values()]));
    this.linkMap.observe(() => this.links.set(this.linkMap.toJSON()));
  }

  titles(): string[] {
    return this.list().map(n => n.title);
  }

  findByTitle(title: string): NoteMeta | undefined {
    const t = title.trim().toLowerCase();
    return this.list().find(n => n.title.toLowerCase() === t);
  }

  /** Make sure a note that exists in the API also exists in the shared index. */
  async ensureIndexed(meta: NoteMeta) {
    await this.ready;
    const cur = this.notes.get(meta.id);
    if (!cur || cur.title !== meta.title) this.notes.set(meta.id, meta);
  }

  /** Follow a [[link]]: find the note, or create it through the API if missing. */
  async openByTitle(title: string): Promise<string> {
    await this.ready;
    const found = this.findByTitle(title);
    if (found) return found.id;

    const created = await firstValueFrom(this.api.create(title.trim())) as NoteMeta;
    this.notes.set(created.id, { id: created.id, title: created.title,content:created.id });
    return created.id;
  }

  setLinks(id: string, targets: string[]) {
    const prev = this.linkMap.get(id);
    if (prev && prev.length === targets.length && prev.every((t, i) => t === targets[i])) return;
    this.linkMap.set(id, targets); // skip no-op writes so peers aren't spammed
  }
}