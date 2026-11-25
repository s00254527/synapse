import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphViewCompoentComponent } from './graph-view-compoent.component';

describe('GraphViewCompoentComponent', () => {
  let component: GraphViewCompoentComponent;
  let fixture: ComponentFixture<GraphViewCompoentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphViewCompoentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GraphViewCompoentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
