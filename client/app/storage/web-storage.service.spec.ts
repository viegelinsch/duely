import { TestBed } from '@angular/core/testing';

import { WebStorageService } from './web-storage.service';

/**
 * FileSaver 2.0.5 is CJS-only, so esbuild's synthesized namespace object is
 * non-configurable and `vi.spyOn(FileSaver, 'saveAs')` throws ("Cannot redefine
 * property: saveAs" on Angular 20, "Cannot spy on export ... Module namespace
 * is not configurable in ESM" on Angular 21 / Vitest 4). A `vi.mock` factory
 * replaces the module record itself instead. The A3 probe verified that this
 * mock really reaches the production import in this Angular + Vitest pipeline:
 * an identity check (`FileSaver.saveAs === saveAs`) and a call observed from
 * `WebStorageService.saveText` both held, and the recorded negative control
 * (invocation removed) makes the assertions below fail, so the seam cannot be
 * green by accident.
 */
const { saveAs } = vi.hoisted(() => ({
    saveAs: vi.fn<(file: File, filename?: string, autoBom?: boolean) => void>()
}));

vi.mock('file-saver', () => ({ default: { saveAs }, saveAs }));

/**
 * jsdom's File exposes `FileReader` but not the newer `Blob.text()` promise
 * API, so content is read through the reader the browser path uses.
 */
function readText(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== 'string') {
                reject(new Error('FileReader returned a non-text result'));
                return;
            }
            resolve(result);
        };
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsText(file);
    });
}

describe('WebStorageService', () => {
    let service: WebStorageService;

    beforeEach(() => {
        saveAs.mockClear();
        TestBed.configureTestingModule({
            providers: [WebStorageService]
        });
        service = TestBed.inject(WebStorageService);
    });

    it('should download files', () => {
        expect(() => service.saveText('Test')).not.toThrow();
        expect(() => service.saveText('Another test', 'myfile.txt')).not.toThrow();
        expect(saveAs).toHaveBeenCalledTimes(2);

        // Default name: saveText passes `undefined` so FileSaver falls back to
        // the File's own name; `autoBom` stays the third argument.
        const [defaultFile, defaultName, autoBom] = saveAs.mock.calls[0];
        expect(defaultName).toBeUndefined();
        expect(autoBom).toBe(true);
        expect(defaultFile).toBeInstanceOf(File);
        expect(defaultFile.name).toBe('duely.ics');
        expect(defaultFile.type).toBe('text/calendar');

        const [namedFile, namedName] = saveAs.mock.calls[1];
        expect(namedName).toBeUndefined();
        expect(namedFile.name).toBe('myfile.txt');
        expect(namedFile.type).toBe('text/calendar');
    });

    it('should save a file correctly', () => verifySavedFile(service));
});

/**
 * The awaited assertions live in a function declaration because Vitest 5.1.0
 * rejects an async arrow in a module that also registers `vi.mock`/`vi.hoisted`:
 * its mock-hoisting plugin reports the correctly top-level calls as nested when
 * the file contains an async arrow (a probe measured arrows failing and function
 * declarations passing). The assertions themselves are unchanged.
 */
async function verifySavedFile(target: WebStorageService): Promise<void> {
    const ics = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n';
    target.saveText(ics, 'calendar.ics');
    expect(saveAs).toHaveBeenCalledTimes(1);

    const [file] = saveAs.mock.calls[0];
    expect(file.name).toBe('calendar.ics');
    expect(file.type).toBe('text/calendar');
    await expect(readText(file)).resolves.toBe(ics);
}
