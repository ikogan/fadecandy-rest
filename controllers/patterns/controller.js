var patterns = require('lib/patterns.js');
var opc = require('lib/opc.js')();
var _ = require('lodash');

var currentPattern = null;

module.exports = {
	activate: function(request, reply) {
		var pattern = request.params.pattern;

		if(pattern) {
			pattern = encodeURIComponent(pattern);

			if(_.has(patterns, pattern)) {
				opc.startPattern(patterns[pattern]);
				currentPattern = pattern;
			} else {
				return reply("Color " + color + " not found.").code(404);
			}
		} else {
			return reply("Color " + color + " not found.").code(404);
		}

		return reply().code(204);
	},

	current: function(request, reply) {
		return reply(pattern);
	}
}