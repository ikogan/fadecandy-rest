/**
 * Currently all patterns are defined in this file. The keys of the object
 * are used as the names. TODO: Load up patterns from Require modules
 * rather than defining them all in the libs.
 */
var debug = require('debug')('fadecandy-rest:lib:patterns');
var opc = require('lib/opc.js')();

var patterns = {
	strip_redblue: function() {
		// Taken from the FadeCandy examples and adapted slightly
		// for this API.
		debug('Red/Blue Strip Starting...');

		// Create a set of pixels.
		var pixels = opc.createPixels();

		// Main render function
		function draw() {
		    var millis = new Date().getTime();

			// Set all pixels in our LED strip
		    for (var pixel = 0; pixel < opc.numPixels; pixel++)
		    {
		        var t = pixel * 0.2 + millis * 0.002;
		        var red = 128 + 96 * Math.sin(t);
		        var green = 128 + 96 * Math.sin(t + 0.1);
		        var blue = 128 + 96 * Math.sin(t + 0.3);

		        pixels.set(pixel, red, green, blue);
		    }

			// Send this set of pixels
		    pixels.send();
		}

		// Ensure the draw function gets called every 30ms and return
		// that interval so the API can control it.
		return setInterval(draw, 30);		
	}
}


module.exports = patterns;