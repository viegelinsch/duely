/**
 * This file handles the Electron code and manages the windows
 *
 * The window loads the built client through the privileged `app://duely`
 * protocol instead of `file://`. A fixed, secure origin is what the bundle
 * needs: the Angular build emits a root-absolute `<base href="/">`, which the
 * `file://` scheme cannot resolve (Known Limitations i.9), and storage as well
 * as fetch() require a real origin. Every response is read from the local
 * `static/browser` directory; the protocol never opens a network connection.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This file contains modified code based on the Electron Quick Start guide.
 * For reference see https://github.com/electron/electron-quick-start/blob/master/main.js
 */

import { app, BrowserWindow, ipcMain, net, protocol, session } from 'electron';
import type { IpcMainEvent } from 'electron';
import { realpathSync, statSync } from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

/**
 * The scheme and host form one fixed local origin. `standard` makes relative
 * URL resolution and history/storage work, `secure` exempts the origin from
 * mixed-content rules, and `supportFetchAPI`/`corsEnabled` let the bundle load
 * its lazy chunks and i18n files through the ordinary fetch path.
 */
const SCHEME = 'app';
const HOST = 'duely';
const ORIGIN = `${SCHEME}://${HOST}`;
const START_URL = `${ORIGIN}/`;

/**
 * Keep a global reference of the window object, if you don't, the window will
 * be closed automatically when the JavaScript object is garbage collected.
 */
let mainWindow: BrowserWindow | null = null;

/**
 * Computed directory of static files independent of operating system
 */
const clientFolder: string = path.resolve(__dirname, 'static', 'browser');

/**
 * The real path of that directory. Every served file is checked against it
 * again, so a symlink inside the build cannot escape it.
 */
const clientRoot: string = (() => {
  try {
    return realpathSync(clientFolder);
  } catch {
    return clientFolder;
  }
})();

const indexFile: string = path.join(clientRoot, 'index.html');

/**
 * Must run before the app is ready: privileges cannot be changed afterwards.
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

/**
 * Minimal plain-text rejection. It carries no filesystem information on
 * purpose; only accepted paths reach the file system at all.
 */
function reject(status: number, message: string): Response {
  return new Response(`${message}\n`, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
}

/**
 * Maps a request path onto a file inside the static root, or null when the
 * path is not acceptable.
 *
 * URL parsing already collapses literal `..` segments, so these checks are
 * defence in depth rather than the only barrier: one explicit decoding step
 * exposes encoded separators and dot segments, and the resolved path must stay
 * inside the root in both its lexical and its real form.
 */
function resolveRequestPath(pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\') || /%2e|%2f|%5c/i.test(decoded)) {
    return null;
  }
  if (decoded.split('/').includes('..')) {
    return null;
  }
  const relative = decoded.startsWith('/') ? `.${decoded}` : `./${decoded}`;
  const target = path.resolve(clientRoot, relative);
  if (target !== clientRoot && !target.startsWith(`${clientRoot}${path.sep}`)) {
    return null;
  }
  return target;
}

/**
 * @returns the file's real path when it is a regular file inside the root
 */
function realFileInsideRoot(file: string): string | null {
  try {
    if (!statSync(file).isFile()) {
      return null;
    }
    const real = realpathSync(file);
    return real === clientRoot || real.startsWith(`${clientRoot}${path.sep}`) ? real : null;
  } catch {
    return null;
  }
}

/**
 * Answers one protocol request.
 *
 * A path without an extension is a client-side route: the router owns it, so a
 * missing file is answered with `index.html`. A path with an extension is an
 * asset request, and a missing asset is a 404 instead of the page - the two
 * failures must stay distinguishable.
 */
async function serve(request: Request): Promise<Response> {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return reject(400, 'bad request');
  }
  if (url.host !== HOST) {
    return reject(404, 'unknown host');
  }
  if (request.method !== 'GET') {
    return reject(405, 'method not allowed');
  }
  const target = resolveRequestPath(url.pathname);
  if (target === null) {
    return reject(400, 'rejected path');
  }
  const assetRequest = path.extname(target) !== '';
  let file = target;
  if (realFileInsideRoot(file) === null) {
    if (assetRequest) {
      return reject(404, 'missing asset');
    }
    file = indexFile;
  }
  const real = realFileInsideRoot(file);
  if (real === null) {
    return reject(404, 'not found');
  }
  try {
    return await net.fetch(pathToFileURL(real).toString());
  } catch {
    return reject(500, 'unreadable file');
  }
}

/**
 * Registered on the session the window actually uses. `webPreferences` below
 * sets no partition, so that session is the default one.
 */
function registerProtocolHandler(): void {
  session.defaultSession.protocol.handle(SCHEME, (request) => serve(request));
}

/**
 * @returns true for URLs this application owns
 */
function isAppUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === `${SCHEME}:` && url.host === HOST;
  } catch {
    return false;
  }
}

/**
 * Keeps the window on its own origin: no popups, no external navigation and no
 * <webview>. The sandbox and context isolation below stay in place; nothing
 * here is relaxed to make the window start.
 */
function restrictNavigation(browserWindow: BrowserWindow): void {
  browserWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  browserWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) {
      event.preventDefault();
    }
  });
  browserWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
}

/**
 * Create a new main browser window
 */
function createWindow(): void {
  const browserWindow: BrowserWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Duely',
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });
  mainWindow = browserWindow;
  browserWindow.setMenu(null);
  restrictNavigation(browserWindow);
  void browserWindow.loadURL(START_URL);
  browserWindow.once('ready-to-show', () => {
    browserWindow.show();
  });
  browserWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  /* On OS X it is common for applications and their menu bar
   * to stay active until the user quits explicitly with Cmd + Q
   */
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handler before the first window: the privileges above are already in place,
// so the window navigates to an origin that can serve it.
void app.whenReady().then(() => {
  registerProtocolHandler();
  createWindow();
  app.on('activate', () => {
    /*
     * On OS X it's common to re-create a window in the app when the
     * dock icon is clicked and there are no other windows open.
     */
    if (mainWindow === null) {
      createWindow();
    }
  });
});

ipcMain.on('openSaveDialog', (event: IpcMainEvent) => {
  event.sender.send('asynchronous-reply', 'pong');
});
