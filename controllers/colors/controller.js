var config = require('config');
var opc = require('lib/opc.js')();
var _ = require('lodash');

module.exports = {
	activate: function(request, reply) {
		var color = request.params.color;

		if(color) {
			color = encodeURIComponent(color);

			if(config.has('colors.' + color)) {
				color = config.get('colors.' + color);
			} else {
				return reply("Color " + color + " not found.").code(404);
			}
		} else {
			if(_.isArray(request.payload)) {
				color = request.payload;
			} else {
				return reply("Invalid color specified.").code(400);
			}
		}

		opc.fillColor(color);

		return reply().code(204);
	},

	current: function(request, reply) {
		var currentColor = opc.currentColor;
		var name = "custom";

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