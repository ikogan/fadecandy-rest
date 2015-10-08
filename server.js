/**
 * FadeCandy REST Server.
 *
 * @author Ilya Kogan <ikogan@flarecode.com>
 */
var fs = require('fs');
var hapi = require('hapi');

// This may be a bit ugly but it helps deal with requiring small libraries
// without having to maintain a symlink in the repo, actually committing
// node modules, or doing relative imports. I do think some of these should
// be broken out into separate projects though.
if(!fs.existsSync('./node_modules/lib')) {
	debug('Creating initial library link...');
	fs.symlinkSync('../lib', './node_modules/lib');
}

// Determine what the app name is, omitting the "node" if we're running
// by starting node explicitly. Then move on to parse command line options.
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

// Setup debugging, configuration, and the OPC client
var debug = require('debug')('fadecandy-rest:server');
var config = require('config');
var opc = require('lib/opc.js')(config.get('opc.host'), config.get('opc.port'));

// Create the hapi server
var server = new hapi.Server();
server.connection({
	host: config.get('host'),
	port: config.get('port')
});

// Connect to the FadeCandy OPC server, when it's done, setup and start
// hapi.
opc.connect().then(function(opc) {
	// We need vision and inert for lout. Good for logging, lout
	// for basic documentation, hapi-router for route
	// loading. Finally, we have a custom error handler.
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