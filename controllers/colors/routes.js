var config = require('config');
var controller = require('./controller');

module.exports = [{
	method: 'GET',
	path: '/colors',
	handler: function(request, reply) {
		reply(config.get('colors'));
	},
	config: {
		description: 'List all preconfigured colors.',
		tags: ['api', 'colors']
	}
}, {
	method: 'POST',
	path: '/color/{color}/activate',
	handler: controller.activate,
	config: {
		description: 'Activate the specified named color.',
		tags: ['api', 'colors']
	}
}, {
	method: 'PUT',
	path: '/color',
	handler: controller.activate,
	config: {
		description: 'Activate a custom color.',
		tags: ['api', 'colors']
	}
}, {
	method: 'GET',
	path: '/color',
	handler: controller.current,
	config: {
		description: 'Get the currently active color.',
		tags: ['api', 'colors']
	}
}];