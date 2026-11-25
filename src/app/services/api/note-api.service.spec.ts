import { TestBed } from '@angular/core/testing';

import { NoteApiService } from './note-api.service';

describe('NoteApiService', () => {
  let service: NoteApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NoteApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
