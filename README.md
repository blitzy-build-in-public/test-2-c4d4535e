# Node.js Hello World HTTP Server

## Purpose

A minimal Node.js HTTP server written as a tutorial: a single file, no framework, and no
dependencies beyond Node.js's own built-in modules. It answers `GET /hello` with status `200` and
the body `Hello world`, and it answers every other method and path with status `404` and the body
`Not Found`. It takes its listening port from the `PORT` environment variable, writes one console
line for every request it receives, and shuts down cleanly on `CTRL+C`. Read `server.js` top to
bottom — that one file is the whole program.

## Prerequisites

- Node.js v18.0.0 or newer. The floor is declared in `package.json` as
  `"engines": { "node": ">=18.0.0" }`.
- `curl` for the request probes below. It ships with macOS, most Linux distributions and
  Windows 10 and later.

Check the runtime:

```bash
node --version
```

```text
v22.23.3
```

Any version from `v18.0.0` upward works; the line above shows the version installed on the machine
this documentation was written on.

## Installation

None. The project declares no dependencies — it loads only Node.js's built-in `http` module — so
there is nothing to download and no install step. Once `node --version` reports v18.0.0 or newer,
the server is ready to run from the project root.

## Running the server

Either command starts the server, and both run the same entry point:

```bash
node server.js
```

```bash
npm start
```

`npm start` runs the `start` script from `package.json`, which is `node server.js`, so the two are
equivalent; npm prints its own two-line script banner above the server's output. Either way the
process stays in the foreground and prints one line once it has bound its port:

```text
Server listening on port 3000
```

It then serves requests until you stop it. Every request adds a line to the same console output,
so keep that terminal visible while you probe the server from another one.

## Testing

There is no test file and no test framework in this project. The checks are `curl` requests against
the running process: with the server running in one terminal, open a second terminal and probe it.
The examples below use `curl -i` when the status line and headers matter and `curl -s` when only the
body is shown.

The documented route:

```bash
curl -i http://localhost:3000/hello
```

```text
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Wed, 01 Jan 2025 00:00:00 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 11

Hello world
```

`Content-Length` is 11 because `Hello world` is 11 bytes and the body has no trailing newline. The
`Content-Type` value is exactly `text/plain`: no charset parameter is sent. Of the headers shown,
only `Date` depends on the moment of the request; `Connection` and `Keep-Alive` depend on the
client's protocol and its `Connection` header, and on the server's keep-alive timeout of five
seconds (`timeout=5`). That is why only the status line, `Content-Type` and the body are fixed.

Any other route:

```bash
curl -i http://localhost:3000/invalid
```

```text
HTTP/1.1 404 Not Found
Content-Type: text/plain
Date: Wed, 01 Jan 2025 00:00:00 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 9

Not Found
```

The route match requires the method and the path together. The table shows what that means for the
requests a reader is most likely to try:

| Request | Status | Body |
|---------|--------|------|
| `GET /hello` | `200` | `Hello world` |
| `GET /hello?x=1` | `200` | `Hello world` |
| `GET /hello/` | `404` | `Not Found` |
| `POST /hello` | `404` | `Not Found` |
| `PUT /hello` | `404` | `Not Found` |
| `HEAD /hello` | `404` | (no body) |
| `DELETE /anything` | `404` | `Not Found` |
| `GET /` | `404` | `Not Found` |

A query string does not take part in the match: only the pathname is compared, so `/hello?x=1` is
served by exactly the same branch as `/hello`. A trailing slash does take part: `/hello/` is a
different pathname from `/hello` and falls to `404`. A `HEAD` request receives the status line and
the headers of whichever branch matched — Node suppresses the body of a `HEAD` response — so
`curl -I http://localhost:3000/hello` shows `404` and no body.

## Expected output

Starting the server on its default port:

```bash
node server.js
```

```text
Server listening on port 3000
```

The body of the documented route, in full:

```bash
curl -s http://localhost:3000/hello
```

```text
Hello world
```

The body of every other route, in full:

```bash
curl -s http://localhost:3000/invalid
```

```text
Not Found
```

Neither body ends with a newline, so curl prints the body and your shell prompt returns on the same
line. Every request also writes one line to the server's console before its response is sent, in
the format `[<ISO-8601 timestamp>] [<METHOD>] [<path>]`:

```text
[2025-01-01T00:00:00.000Z] [GET] [/hello]
```

The timestamp is the only part of that line that varies; it is an ISO-8601 UTC timestamp. The
method is the request's method in upper case, and the path is the pathname the routing decision
used. A session that starts the server and then makes that one request therefore leaves this in the
server's terminal:

```text
Server listening on port 3000
[2025-01-01T00:00:00.000Z] [GET] [/hello]
```

Stopping the server writes one further line:

```text
Shutting down server
```

The only two response bodies the server can write are `Hello world` and `Not Found`. No status
code, error code, message or stack trace is ever sent to a client. A failure to start — a `PORT`
the server refuses, or a port it cannot bind — is reported on the server's own console, on stderr,
and ends the process with status `1`.

Requests are different. A malformed request line is answered by the runtime itself, before the
server sees it, and a request target that cannot be parsed as a URL is logged on stdout like any
other request and still answered with one of those two bodies while the process keeps running.

## Stopping the server

Press `CTRL+C` in the terminal running the server. It prints:

```text
Shutting down server
```

and exits with status `0`. The listener is closed, so a request made after that cannot connect —
`curl http://localhost:3000/hello` exits with curl's status `7`, which is curl reporting that it
could not connect to the host. The shutdown also destroys every connection still open, so the
prompt comes straight back instead of waiting for an idle keep-alive connection to expire.

To see the exit status yourself, start the server as a background job and interrupt it:

```bash
node server.js &
sleep 1
kill -INT $!
wait $!; echo "exit=$?"
```

```text
exit=0
```

The `sleep 1` gives the server time to bind its port and install its signal handler: a `SIGINT`
delivered before that takes Node's default disposition, which ends the process with status `130`
rather than the `0` shown above.

An exit status of `1` instead means the server refused to start, and the reason is on stderr — see
the [Configuration](#configuration) section for how that happens.

## Configuration

The server reads one setting from the environment.

| Setting | Source | Default | Accepted values |
|---------|--------|---------|-----------------|
| `PORT` | the process environment, read through `process.env.PORT` | `3000` | a digits-only integer from `1024` to `65535`, inclusive |

Override the default by passing the variable to the command:

```bash
PORT=8080 node server.js
```

```text
Server listening on port 8080
```

The server now serves the same two contracts on port 8080, so
`curl -i http://localhost:8080/hello` answers `200` with `Hello world`. The default applies only
when `PORT` is unset entirely: `PORT=` sets the variable to an empty string, which counts as
present and is therefore rejected rather than falling back to `3000`.

A value outside the accepted range, or one that is not a digits-only integer, is refused before
anything is bound. The message goes to stderr and the process exits with status `1`:

```bash
PORT=abc node server.js; echo "exit=$?"
```

```text
Configuration error: PORT must be an integer between 1024 and 65535 (received "abc")
exit=1
```

Only digits are accepted, so a value a lenient numeric conversion would quietly accept is refused
too — `3000abc`, `3.5`, `-1`, `0`, `1e3`, `65536` and an empty value each print the same message
naming the offending raw value and exit `1`. Ports below `1024` are refused as well, which is how
the server refuses to bind a privileged port: `PORT=80` fails the same way, with `received "80"`,
and no bind is attempted.

Starting a second instance on a port that is already in use is caught at bind time and reported the
same way:

```bash
node server.js
```

```text
Failed to start server: port 3000 is already in use (EADDRINUSE). Stop the process using that port or set PORT to a free port.
```

That line goes to stderr and the process exits with status `1`; the instance already listening on
the port is not affected.

Any other failure to bind — descriptor exhaustion, for instance — is reported on stderr as
`Failed to start server: <code> <message>`, and the process exits with status `1` as well.
