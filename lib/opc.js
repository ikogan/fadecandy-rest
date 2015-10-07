/**
 * OPC client with several convenient methods.
 * Some code loosely based on FadeCandy's own `opc.js`.
 * A lot of the PixelBuffer code is basically opc.js.
 *
 * @author Ilya Kogan <ikogan@flarecode.com>
 */
var config = require('config');
var debug = require('debug')('fadecandy-rest:lib:opc');
var net = require('net');
var Promise = require('bluebird');
var Worker = require('webworker-threads').Worker;

var singleton = null;

var PixelBuffer = function(opc) {
	this.pixelBuffer = new Buffer(4 + opc.numPixels*3);
	this.opc = opc;

	// Initialize OPC header
	this.pixelBuffer.writeUInt8(0, 0);           // Channel
	this.pixelBuffer.writeUInt8(0, 1);           // Command
	this.pixelBuffer.writeUInt16BE(opc.numPixels * 3, 2);  // Length	
}

PixelBuffer.prototype.fill = function(num, r, g, b) {
	for(var i = 0; i < num; ++i) {
		this.set(i, r, g, b);
	}

	return this;
}

PixelBuffer.prototype.set = function(num, r, g, b)
{
	var offset = 4 + num*3;

	this.pixelBuffer.writeUInt8(Math.max(0, Math.min(255, r | 0)), offset);
	this.pixelBuffer.writeUInt8(Math.max(0, Math.min(255, g | 0)), offset + 1);
	this.pixelBuffer.writeUInt8(Math.max(0, Math.min(255, b | 0)), offset + 2);

	return this;
}

PixelBuffer.prototype.send = function() {
	this.opc.send(this.pixelBuffer);
}

var OPC = function(host, port, callback) {
	this.currentColor = [0,0,0];
	this.host = host;
	this.port = port;
	this.numPixels = config.get('opc.numPixels');
	this.patternThread = null;

	this.currentPixels = this.createPixels(this);
	this.currentPixels.fill(this.numPixels,
		this.currentColor[0],
		this.currentColor[1],
		this.currentColor[2]);
	this.currentPixels.fill(this.numPixels, 0,0,0);

	this.defaults = {
		fillSpeed: config.has('opc.defaults.fillSpeed') ? 
			config.get('opc.defaults.fillSpeed') : 500
	};

	this.socket = null;
};

OPC.prototype.isConnected = function() {
	return this.socket !== null;
};

OPC.prototype.connect = function() {
	var deferred = Promise.pending();

	if(this.socket === null) {
		debug('Connecting to ' + this.host + ":" + this.port);
		this.socket = new net.Socket();
		this.socket.connect(this.port, this.host, function() {
			this.socket.setNoDelay();
			this.fillColor(this.currentColor, 0);
			deferred.resolve(this);			
		}.bind(this));

		this.socket.onerror = function() {
			this.socket = null;
			console.warning("Connection to " + this.uri + " failed. Reconnecting...");
			this.connect().then(function(opc) {
				deferred.resolve(opc);
			});
		}.bind(this);
	} else {
		deferred.resolve(this);
	}

	return deferred.promise;
};

OPC.prototype.send = function(pixels) {
	if(pixels.constructor === PixelBuffer) {
		this.currentPixels = pixels;
		pixels.send();
	} else {
		this.socket.write(pixels);
	}
};


OPC.prototype.createPixels = function() {
	return new PixelBuffer(this);
};

OPC.prototype.transition = function(f, fillSpeed) {
	this.currentPixels.send();
	setTimeout(f, fillSpeed || this.defaults.fillSpeed);
}

OPC.prototype.stopPattern = function() {
	if(this.patternThread) {
		debug("Stopping pattern.");
		this.patternThread.terminate();
		this.patternThread = null;
	}
};

OPC.prototype.startPattern = function(pattern, fillSpeed) {
	this.stopPattern();

	debug("Starting new pattern.");
	this.transition(function() {
		this.patternThread = new Worker(pattern);
	}, fillSpeed);
};

OPC.prototype.fillColor = function(color, fillSpeed) {
	fillSpeed = fillSpeed || this.defaults.fillSpeed;

	debug("Filling with color " + color + " at " + fillSpeed + "ms");

	var pixels = this.createPixels(this).fill(this.numPixels, color[0], color[1], color[2]);

	this.stopPattern();
	this.transition(function() {
		pixels.send();
		this.currentColor = color;
	}, fillSpeed);
};

module.exports = function(host, port) {
	if(!singleton) {
		singleton = new OPC(host, port);
	} else if(host || port) {
		throw new "Cannot connect to more than one OPC server.";
	}

	return singleton;
}
