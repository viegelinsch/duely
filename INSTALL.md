# Duely Installation

## Prerequisites
Install Node.js and NPM from [Nodejs.org](https://nodejs.org/en/).
Make sure not to get the LTS version, but the newest one. If uncertain,
Node version 8.1.2 is guaranteed to be working.
During installation, make sure the "Install NPM" option remains checked.
Install Python 2.7 from [Python.org](https://www.python.org/).

### For Windows
In addition, run a Node.js command prompt with administrator privileges and
execute `npm i -g windows-build-tools`.

## Install Duely

- Checkout this repsitory
- Navigate to `trunk/source` with your console (or Node.js command prompt on Windows)
- Install dependencies: `npm install`
- Build project from source: `npm run build:prod`

### Optional: Run the tests
- Run `npm run test` to execute the unit tests once (Vitest via `ng test`). Use `npm run test:watch`
  to keep them running in watch mode, or `npm run test:coverage` to also write a coverage report.
- Run `npm run test:e2e` to execute the end to end tests (Playwright) and to show the results in the console.

## Verify local installation
You can try out the application by starting it on your local machine.
Use `npm run start:server` to start a Node server that serves the application
to your browser. You can access the website on [http://localhost:8000]([http://localhost:8000/]) or the address you find in
the console.

Alternatively, use `npm run start:electron` to launch Duely as a native application.

## Serve with PM2

- Install PM2 to daemonize app: `npm i -g pm2` as super-user or admin
- Configure PM2 for startup: `pm2 startup systemd` as super-user or admin
- Start application: `pm2 start npm -- start:server`
- This starts an express server on port `8000`.

## Proxy traffic

Setup a reverse proxy to redirect ingoing messages to the Node server.
You can use the following configuration files to do so.

### Apache2

```
<VirtualHost *:80/443>
  ServerName example.com
  ServerAlias mysub.example.com

  RequestHeader set X-Forwarded-Proto "https"
  ProxyRequests Off
  AllowEncodedSlashes NoDecode
  ProxyPass / http://127.0.0.1:8000/ nocanon retry=0
  ProxyPassReverse / http://127.0.0.1:8000/

  [...]
</VirtualHost>
```


### Nginx

```
upstream duely_express_upstream {
  server 127.0.0.1:8000;
  keepalive 64;
}

server {
  listen 80;
  server_name example.com;

  location / {
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $http_host;
    proxy_set_header X-NginX-Proxy true;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_max_temp_file_size 0;
    proxy_pass http://my_nodejs_upstream/;
    proxy_redirect off;
    proxy_read_timeout 240s;
  }
}
```

## Package Electron as an application

Packaging Duely into a native Desktop application is currently not available: the repository
defines no packaging script, so there is no `npm run` command that produces platform installers
or binaries. `npm run build:electron:prod` builds the Electron bundle into `dist/electron/`, but
turning that output into a packaged, installable application is not wired up yet.

## Full command overview
You can find a full overview over the options inside the README file.
