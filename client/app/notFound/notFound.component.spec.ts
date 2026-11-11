import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';

import { NotFoundComponent } from './notFound.component';

describe('AboutComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ NotFoundComponent, RouterTestingModule ],
      providers: [ provideTranslateService() ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', inject([TranslateService],
      () => {
    expect(component).toBeTruthy();
  }));
});
