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
        // Round-trips through the real Web Storage implementation Vitest's jsdom
        // environment installs, with no Node localStorage flag involved:
        // persist, read the raw blob back, then re-hydrate the service from it.
        service.settings.language = 'de';
        service.settings.timeZone = 'Europe/Berlin';
        service.saveSettings(service.settings);

        const persisted = JSON.parse(localStorage.getItem('settings')!) as Record<string, unknown>;
        expect(persisted.language).toBe('de');
        expect(persisted.timeZone).toBe('Europe/Berlin');
        expect(service.settingsLoaded).toBe(true);

        service.settings.language = 'en';
        service.loadSettings();
        expect(service.settings.language).toBe('de');
        expect(service.settings.timeZone).toBe('Europe/Berlin');

        sessionStorage.setItem('__duely_round_trip__', 'ok');
        expect(sessionStorage.getItem('__duely_round_trip__')).toBe('ok');
        sessionStorage.removeItem('__duely_round_trip__');
    }));

});
