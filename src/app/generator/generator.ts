import { AfterViewInit, Component, ElementRef, NgZone,OnDestroy,ViewChild } from '@angular/core';
import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import {yCollab} from 'y-codemirror.next';
import {EditorState} from '@codemirror/state';


@Component({
  selector: 'app-generator',
  imports: [],
  templateUrl: './generator.html',
  styleUrl: './generator.css',
})
export class Generator {}
