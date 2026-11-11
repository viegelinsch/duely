import { TestBed } from '@angular/core/testing';

import { ElectronStorageService } from './electron-storage.service';

/**
 * Same FileSaver seam as the web spec: FileSaver 2.0.5 is CJS-only, so the
 * esbuild namespace is non-configurable and namespace spying is impossible on
 * Vitest 4. `vi.mock` with a factory replaces the module record and was proven
 * to intercept the production import in the A3 probe; the recorded negative
 * control (invocation removed) fails these assertions.
 */
const { saveAs } = vi.hoisted(() => ({
    saveAs: vi.fn<(file: File, filename?: string, autoBom?: boolean) => void>()
}));

vi.mock('file-saver', () => ({ default: { saveAs }, saveAs }));

/** jsdom's File has no `Blob.text()`, so content is read through FileReader. */
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

describe('ElectronStorageService', () => {
    let service: ElectronStorageService;

    beforeEach(() => {
        saveAs.mockClear();
        TestBed.configureTestingModule({
            providers: [ElectronStorageService]
        });
        service = TestBed.inject(ElectronStorageService);
    });

    it('should ...', () => {
        expect(service).toBeTruthy();
    });

    it('should save a file correctly', () => verifySavedFile(service));

    it('should fall back to the default duely.ics name', () => {
        service.saveText('no name given');
        expect(saveAs).toHaveBeenCalledTimes(1);

        const [file] = saveAs.mock.calls[0];
        expect(file.name).toBe('duely.ics');
        expect(file.type).toBe('text/calendar');
    });
});

/**
 * Same Vitest 5.1.0 constraint as the web spec: an async arrow in a module that
 * registers `vi.mock`/`vi.hoisted` is reported as nested by the mock-hoisting
 * plugin, while a function declaration is accepted. The assertions are unchanged.
 */
async function verifySavedFile(target: ElectronStorageService): Promise<void> {
    target.saveText('electron test', 'test.txt');
    expect(saveAs).toHaveBeenCalledTimes(1);

    const [file, filename, autoBom] = saveAs.mock.calls[0];
    expect(filename).toBeUndefined();
    expect(autoBom).toBe(true);
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('test.txt');
    expect(file.type).toBe('text/calendar');
    await expect(readText(file)).resolves.toBe('electron test');
}
