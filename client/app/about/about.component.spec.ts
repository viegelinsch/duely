import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';

import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ AboutComponent, RouterTestingModule ],
      providers: [ provideTranslateService() ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', inject([TranslateService],
      () => {
    expect(component).toBeTruthy();
  }));
});
