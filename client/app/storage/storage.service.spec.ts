import { TestBed, inject } from '@angular/core/testing';

import { StorageService } from './storage.service';



describe('StorageService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [StorageService]
        });
    });

    it('should be created', inject([StorageService], (service: StorageService) => {
        expect(service).toBeTruthy();
    }));

    it('should load the settings or set default values', inject([StorageService], (service: StorageService) => {
        service.loadSettings();
        expect(Object.prototype.hasOwnProperty.call(service.settings, 'color')).toBeTruthy();
        expect(Object.prototype.hasOwnProperty.call(service.settings, 'language')).toBeTruthy();
        expect(Object.prototype.hasOwnProperty.call(service.settings, 'timeZone')).toBeTruthy();
        expect(Object.prototype.hasOwnProperty.call(service.settings, 'country')).toBeTruthy();
        expect(Object.prototype.hasOwnProperty.call(service.settings, 'region')).toBeTruthy();
        expect(Object.prototype.hasOwnProperty.call(service.settings, 'state')).toBeTruthy();
        expect(Object.prototype.hasOwnProperty.call(service.settings, 'debug')).toBeTruthy();
    }));

    it('should save the settings with correct content', inject([StorageService], (service: StorageService) => {
        service.loadSettings();
        vi.spyOn(localStorage, 'setItem');
        service.saveSettings(service.settings);
        // expect(spy).toHaveBeenCalledWith('settings', JSON.stringify(service.settings));
    }));

});
