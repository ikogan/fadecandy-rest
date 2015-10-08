/**
 * FadeCandy REST Server.
 *
 * @author Ilya Kogan <ikogan@flarecode.com>
 */
var fs = require('fs');
var hapi = require('hapi');

if(!fs.existsSync('./node_modules/lib')) {
	debug('Creating initial library link...');
	fs.symlinkSync('../lib', './node_modules/lib');
}

var appName = process.argv[0] === 'node' ? 'node ' + process.argv[1] : process.argv[0];
var args = require('yargs')
			.usage('Usage: ' + appName + " [options]")
			.alias('c', 'config')
			.nargs('c', 1)
			.default('c', './config')
			.describe('c', 'Configuration directory.')
			.help('help')
			.argv;

if(args.config) {
	process.env['NODE_CONFIG_DIR'] = args.config;
}

var debug = require('debug')('fadecandy-rest:server');
var config = require('config');
var opc = require('lib/opc.js')(config.get('opc.host'), config.get('opc.port'));

var server = new hapi.Server();
server.connection({
	host: config.get('host'),
	port: config.get('port')
});

opc.connect().then(function(opc) {
	server.register([require('vision'), require('inert'),
	{
		register: require('good'),
		options: {
			opsInterval: 1000,
			reporters: [{
				reporter: require('good-console'),
				events: { log: '*', response: '*' }
			}]
		}
	}, {
		register: require('lout'),
		options: {
			endpoint: '/'
		}
	}, {
		register: require('hapi-router'),
		options: {
			routes: 'controllers/**/routes.js'
		}
	}, {
		register: require('lib/errorHandler.js')
	}], function(error) {
		if(error) {
			console.error(error);
		} else {
			server.start(function() {
				console.info('Server started at ' + server.info.uri);
			})
		}
	});
});