/**
 * Controller to manipulate defined colors or set a constant
 * color fill across all LEDs.
 * 
 * @see routes.js for an explanation of what each exposed method does
 * @author Ilya Kogan <ikogan@flarecode.com>
 */
var config = require('config');
var opc = require('lib/opc.js')();
var _ = require('lodash');

module.exports = {
	activate: function(request, reply) {
		var color = request.params.color;

		if(color) {
			// If a color is on the URL, lookup it's color values from
			// the config and set them.
			color = encodeURIComponent(color);

			if(config.has('colors.' + color)) {
				color = config.get('colors.' + color);
			} else {
				return reply("Color " + color + " not found.").code(404);
			}
		} else {
			// If a color is not set, set if a color tripple was sent
			// as the body. Use it if it was.
			if(_.isArray(request.payload)) {
				color = request.payload;
			} else {
				return reply("Invalid color specified.").code(400);
			}
		}

		// Send the color fill to the LEDs and tell the API that it was done.
		// Note that we don't have any way of knowing if it worked.
		opc.fillColor(color);

		return reply().code(204);
	},

	current: function(request, reply) {
		// Lookup the current color value that we're using
		var currentColor = opc.currentColor;
		var name = "custom";

		// See if it's a defined/configured color. If it is, figure
		// out what the name is so we can tell the user.
		if(config.has("colors")) {
			_.forOwn(config.get("colors"), function(value, key) {
				if(_.isEqual(currentColor, value)) {
					name = key;
					return false;
				}
			});
		}

		return reply({
			name: name,
			value: opc.currentColor
		});
	}
}