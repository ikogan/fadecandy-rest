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

// At the moment, we only want to deal with one OPC server so we'll
// make it a singleton. Supporting more than one is a TODO.
var singleton = null;

/**
 * Pixel Buffers are a convenient and fast way to create and send
 * arrays of pixels.
 * 
 * @param opc OPC object to use with this buffer.
 */
var PixelBuffer = function(opc) {
	this.pixelBuffer = new Buffer(4 + opc.numPixels*3);
	this.opc = opc;

	// Initialize OPC header
	this.pixelBuffer.writeUInt8(0, 0);           // Channel
	this.pixelBuffer.writeUInt8(0, 1);           // Command
	this.pixelBuffer.writeUInt16BE(opc.numPixels * 3, 2);  // Length	
}

/**
 * Fill this pixel buffer with one color. This is useful for
 * turning off all of the LEDs or otherwise setting a solid color.
 * 
 * @param num integer Number of pixels to fill.
 * @param r integer Red value
 * @param g integer Green value
 * @param b integer Blue value
 * @return this to facilitate chaining
 */
PixelBuffer.prototype.fill = function(num, r, g, b) {
	for(var i = 0; i < num; ++i) {
		this.set(i, r, g, b);
	}

	return this;
}

/**
 * Set a given pixel to the specified RGB values.
 * 
 * @param num integer Pixel index to set
 * @param r integer Red color value
 * @param g integer Green color value
 * @param b integer Blue color value
 */
PixelBuffer.prototype.set = function(num, r, g, b)
{
	var offset = 4 + num*3;

	this.pixelBuffer.writeUInt8(Math.max(0, Math.min(255, r | 0)), offset);
	this.pixelBuffer.writeUInt8(Math.max(0, Math.min(255, g | 0)), offset + 1);
	this.pixelBuffer.writeUInt8(Math.max(0, Math.min(255, b | 0)), offset + 2);

	return this;
}

/**
 * Send this pixel buffer with our OPC client.
 */
PixelBuffer.prototype.send = function() {
	this.opc.send(this.pixelBuffer);
}

/**
 * The OPC client is the main communication method with the OPC server (surprise).
 * It handles connecting and reconnecting, as well providing several convenient
 * methods to set various LED colors. It keeps track of the last thing sent
 * facilitating easy fades and graceful continual controls, even when running
 * complex patterns.
 *
 * @param host string Hostname or IP address of the OPC server
 * @param port integer Port number of the OPC server
 * @param callback function Callback to call once we're connected.
 */
var OPC = function(host, port, callback) {
	this.host = host;
	this.port = port;
	
	this.numPixels = config.get('opc.numPixels');
	this.reconnectTimer = config.has('opc.reconnecTimer') ? config.get('opc.reconnectTimer') : 5000;
	this.startColor = config.has('opc.startColor') ? config.get('opc.startColor') : [0,0,0];
	
	this.currentPattern = null;
	this.connecting = null;
	this.currentPixels = null;
	this.currentColor = null;

	this.defaults = {
		fillSpeed: config.has('opc.defaults.fillSpeed') ? 
			config.get('opc.defaults.fillSpeed') : 500
	};

	this.socket = null;
};

/**
 * @return true if we're currently connected.
 */
OPC.prototype.isConnected = function() {
	return this.socket !== null;
};

/**
 * @return true if we're in the process of connecting.
 */
OPC.prototype.isConnecting = function() {
	return this.connecting && this.connecting.isPending();
};

/**
 * Connect to the OPC service
 * 
 * @param deferred Promise This should never be used externally. It's
 *                 used when the connection failed and connect needs to call
 *                 itself.
 * @return Promise that will be resolved when this connects.,
 */
OPC.prototype.connect = function(deferred) {
	var that = this;
	
	// Don't do anything if we're currently connecting.
	if(!this.connecting || !this.connecting.isPending()) {
		if(!deferred) {
			deferred = Promise.pending();
		}
		
		this.connecting = deferred.promise;
		
		// If we already have an open socket, don't try to connect again,
		// just resolve the promise.
		if(this.socket) {
			deferred.resolve(this);
		} else {
			debug('Connecting to ' + this.host + ":" + this.port);
			
			// Create the socket and connect, immediately setting it's
			// color to black on connection.
			this.socket = new net.Socket();
			this.socket.connect(this.port, this.host, function() {
				console.log('Connection to ' + that.host + ":" + that.port + ' established.');
				that.socket.setNoDelay();
			
				// If no color is current, fill with the start color	
				if(!that.currentColor && !that.currentPixels) {
					that.fillColor(that.startColor, 0);
				}
				
				deferred.resolve(that);
			});

			// On error, assume we're disconnected and warn.
			this.socket.on('error', function(e) {
				that.socket = null;
				console.warn("Connection to OPC Server failed: " + e.code);
			});

			// When closed, automatically try to reconnect.
			this.socket.on('close', function() {
				that.socket = null;
				console.warn("Connection to " + that.host + ":" + that.port + " closed. Reconnecting...");
				that.connecting = null;
				
				setTimeout(function() {
					that.connect(deferred.promise.isPending() ? deferred : null);
				}, that.reconnectTimer);
			});
		}
	}
	
	return this.connecting;
};

/**
 * Send the specified pixels.
 * 
 * @note The supplied argument can be a PixelBuffer or a raw
 * Buffer. For the latter, it's simply sent. For the former,
 * we set the current pixels to the supplied pixels and instruct
 * them to send themselves. The latter is preferred so we can keep
 * track of the current pixel buffer.
 * 
 * @param pixels (PixelBuffer | Buffer) Buffer to send.
 * @throws when no connection is avaialable.
 */
OPC.prototype.send = function(pixels) {
	if(pixels.constructor === PixelBuffer) {
		this.currentPixels = pixels;
		pixels.send();
	} else {
		if(this.connecting) {
			// Make sure we have requests wait on a pending connection.
			this.connecting.then(function(opc) {
				// We might only find out that our connection died
				// when trying to send. Be graceful.
				try {
					opc.socket.write(pixels);
				} catch(e) {
					this.connect().then(function(opc) {
						opc.send(pixels);
					});
				}
			});
		} else {
			throw { message: 'No OPC connection available.', code: 503 }
		}
	}
};


/**
 * Create a new PixelBuffer.
 * 
 * @return (PixelBuffer)
 */
OPC.prototype.createPixels = function() {
	return new PixelBuffer(this);
};

/**
 * Transition between the current color and a new setting.
 * 
 * @param f (function) Function that implements the setting to transition to
 * @param fillSpeed (integer) Optional. Fill speed of the transition.
 */
OPC.prototype.transition = function(f, fillSpeed) {
	if(this.currentPixels) {
		this.currentPixels.send();
	}
	
	setTimeout(f, fillSpeed || this.defaults.fillSpeed);
}

/**
 * Stop a currently running pattern by clearing the interval
 * or timeout object expected to be returned by the pattern function.
 */
OPC.prototype.stopPattern = function() {
	if(this.currentPattern) {
		debug("Stopping pattern.");
		clearInterval(this.currentPattern);
		clearTimeout(this.currentPattern);
		this.currentPattern = null;
	}
};

/**
 * Start the specified pattern. The pattern must be a function
 * that returns a Timer or Interval object. It's important that
 * this return such an object and use those functions to implement
 * animations.
 * 
 * @param pattern (function) Pattern function.
 * @param fillSpeed (integer) Optional, speed at which to transition to the
 *                            from the current pattern.
 */
OPC.prototype.startPattern = function(pattern, fillSpeed) {
	var that = this;
	
	this.stopPattern();

	debug("Starting new pattern.");
	this.transition(function() {
		that.currentPattern = pattern();
	}, fillSpeed);
};

/**
 * Fill the entire LED set with a solid color.
 * 
 * @param color (Array) RGB array describing the color to fill.
 * @param fillSpeed (integer) Optional. Speed at which to transition from the
 *                            current color.
 */
OPC.prototype.fillColor = function(color, fillSpeed) {
	fillSpeed = fillSpeed || this.defaults.fillSpeed;

	debug("Filling with color " + color + " at " + fillSpeed + "ms");

	var pixels = this.createPixels(this).fill(this.numPixels, color[0], color[1], color[2]);

	this.stopPattern();
	this.transition(function() {
		this.send(pixels);
		this.currentColor = color;
	}.bind(this), fillSpeed);
};

module.exports = function(host, port) {
	// The export function is responsible for either creating a new instance
	// or returning the existing singleton.
	if(!singleton) {
		singleton = new OPC(host, port);
	} else if(host || port) {
		throw new "Cannot connect to more than one OPC server.";
	}

	return singleton;
}
