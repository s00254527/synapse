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
export class Generator {}
