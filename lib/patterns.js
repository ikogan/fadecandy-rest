var debug = require('debug')('fadecandy-rest:lib:patterns');
var opc = require('lib/opc.js')();

var patterns = {
	strip_redblue: function() {
		debug('Red/Blue Strip Starting...');

		var pixels = opc.createPixels();

		function draw() {
		    var millis = new Date().getTime();

		    for (var pixel = 0; pixel < opc.numPixels; pixel++)
		    {
		        var t = pixel * 0.2 + millis * 0.002;
		        var red = 128 + 96 * Math.sin(t);
		        var green = 128 + 96 * Math.sin(t + 0.1);
		        var blue = 128 + 96 * Math.sin(t + 0.3);

		        pixels.set(pixel, red, green, blue);
		    }

		    pixels.send();
		}

		return setInterval(draw, 30);		
	}
}


module.exports = patterns;