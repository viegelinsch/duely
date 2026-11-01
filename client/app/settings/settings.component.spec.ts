import { inject, ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { SettingsComponent } from './settings.component';
import { StorageService } from '../storage/storage.service';
import { selectStorageService } from '../storage/storage.factory';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ SettingsComponent, TranslateModule.forRoot(), ReactiveFormsModule, RouterTestingModule ],
      providers: [ { provide: StorageService, useFactory: selectStorageService } ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', inject([TranslateService],
      () => {
    expect(component).toBeTruthy();
  }));
});
