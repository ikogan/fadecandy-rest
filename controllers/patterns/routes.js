var _ = require('lodash');
var patterns = require('lib/patterns.js');
var controller = require('./controller.js');

module.exports = [{
	method: 'GET',
	path: '/patterns',
	handler: function(request, reply) {
		reply(_.keys(patterns));
	},
	config: {
		description: 'List all preconfigured patterns.',
		tags: ['api', 'patterns']
	}
}, {
	method: 'POST',
	path: '/pattern/{pattern}/activate',
	handler: controller.activate,
	config: {
		description: 'Activate the specified pattern.',
		tags: ['api', 'colors']
	}
}, {
	method: 'GET',
	path: '/pattern',
	handler: controller.current,
	config: {
		description: 'Get the currently active pattern.',
		tags: ['api', 'patterns']
	}
}];