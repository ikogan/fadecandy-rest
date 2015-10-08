# REST API for FadeCandy Based LED Setups

An API for controlling a FadeCandy server controlling a bunch of FadeCandy
boards and LED strips. The intent is to create an easy way to set the patterns,
colors, and behaviors of LED strips on demand.

The server remembers the last pixels sent, whether from a fill or a pattern,
and automatically fades to the new color when a new request is made.

Some of this is heavily based on the examples in the 
[FadeCandy repo](https://github.com/scanlime/fadecandy).

## Installation

Simply clone the project and `npm install`. Then run with `node ./server.js`.

## Configuration

The REST API is configured using the [npm config package](https://www.npmjs.com/package/config).
A default configuration is available in `config/default.json`.

## API

Currently this supports setting predefined colors by their name as configured
in the server config and patterns defined in code. The idea is to make this a
bit more dynamic in the future. The API generates some primitive documentation
with `lout` deployed to the root, by default `http://localhost:8080/`.

*Note that at this time there is absolutely no authenticate or authorization.*

Due to network latency, it is advisable to run the REST API on the same machine
as the FadeCandy WebSocket server. Precise timings for patterns are likely to
be heavily impacted by network latency otherwise.

