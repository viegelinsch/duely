/**
 * This files contains environment specific identifiers
 * that enable environment detection from within the code
 */

/**
 * Web production environment identifiers.
 *
 * This is the target of the `production` configuration's fileReplacements entry
 * in angular.json (`client/environments/environment.ts` -> this file), so it is
 * what `ng build --configuration production` compiles. `isElectron: false`
 * selects PathLocationStrategy and a '/' APP_BASE_HREF in app.config.ts.
 *
 * NOTE: angular.json has NO Electron build configuration and NO fileReplacements
 * entry pointing at `environment.electron-prod.ts`, so the packaged desktop app
 * has always compiled THIS file as well. Consequently `isElectron` is `false`
 * inside Electron, `selectStorageService()` returns `WebStorageService` there,
 * and the file-system save path in `ElectronStorageService` has never been
 * active. The four `environment.electron*.ts` / `environment.server*.ts` files
 * are kept but deliberately left unwired (locked decision 17); this gap is
 * recorded in the forthcoming `docs/2026_KNOWN_LIMITATIONS.md` (backlog-emptying
 * Phase 13).
 */
export const environment = {
  production: true,
  isElectron: false
};
