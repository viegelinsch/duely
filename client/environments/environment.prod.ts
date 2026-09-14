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
 * selects PathLocationStrategy and a '/' APP_BASE_HREF in app.config.ts; the
 * Electron desktop build uses environment.electron-prod.ts instead.
 */
export const environment = {
  production: true,
  isElectron: false
};
