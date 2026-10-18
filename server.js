'use strict';

const http = require('http');

const DEFAULT_PORT = 3000;
const MIN_PORT = 1024;
const MAX_PORT = 65535;

// Path resolution never consults the request's Host header: that header is
// client-controlled, so the base is a fixed literal.
const URL_BASE = 'http://localhost';

const HELLO_PATH = '/hello';
const HELLO_BODY = 'Hello world';
const NOT_FOUND_BODY = 'Not Found';

const sockets = new Set();
let server = null;
let shuttingDown = false;

function readConfiguredPort() {
  const rawPort = process.env.PORT;

  if (rawPort === undefined) {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(rawPort)) {
    return null;
  }

  const port = Number(rawPort);

  if (port < MIN_PORT || port > MAX_PORT) {
    return null;
  }

  return port;
}

// The log timestamp is ISO-8601 in UTC: YYYY-MM-DDTHH:mm:ss.sssZ.
function formatTimestamp() {
  return new Date().toISOString();
}

function logRequest(method, path) {
  console.log(`[${formatTimestamp()}] [${method}] [${path}]`);
}

function getRequestPath(req) {
  try {
    return new URL(req.url, URL_BASE).pathname;
  } catch {
    return req.url;
  }
}

function sendPlainText(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/plain');
  res.end(body);
}

function sendHelloWorld(res) {
  sendPlainText(res, 200, HELLO_BODY);
}

function sendNotFound(res) {
  sendPlainText(res, 404, NOT_FOUND_BODY);
}

function routeRequest(req, res) {
  logRequest(req.method, getRequestPath(req));

  const pathname = getRequestPath(req);

  if (req.method === 'GET' && pathname === HELLO_PATH) {
    sendHelloWorld(res);
  } else {
    sendNotFound(res);
  }
}

function startServer(port) {
  const listeningServer = http.createServer(routeRequest);

  listeningServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `Failed to start server: port ${port} is already in use (EADDRINUSE). ` +
          'Stop the process using that port or set PORT to a free port.'
      );
    } else {
      console.error(`Failed to start server: ${error.code} ${error.message}`);
    }

    process.exit(1);
  });

  // Node 18's server.close() waits for idle keep-alive sockets, and the APIs
  // that would drop them were not added until v18.2.0, so each socket is
  // tracked here and destroyed by the shutdown sequence.
  listeningServer.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  listeningServer.on('listening', () => {
    console.log(`Server listening on port ${port}`);
  });

  listeningServer.listen(port);

  return listeningServer;
}

function handleShutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log('Shutting down server');

  server.close(() => {
    process.exit(0);
  });

  for (const socket of sockets) {
    socket.destroy();
  }
}

const port = readConfiguredPort();

if (port === null) {
  console.error(
    `Configuration error: PORT must be an integer between ${MIN_PORT} and ${MAX_PORT} (received "${process.env.PORT}")`
  );
  process.exit(1);
}

server = startServer(port);
process.on('SIGINT', handleShutdown);
