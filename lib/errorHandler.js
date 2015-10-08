/**
 * Global error handler to catch and return errors that may occur
 * outside of the control or knowledge of a given controller.
 * 
 * @author Ilya Kogan <ikogan@flarecode.com>
 */
var register = function(server, options, next) {
    server.ext('onPreResponse', function(request, reply) {
        if(request.response.isBoom) {
            // 503s probably mean that we lost connection to the OPC server
            if(request.response.data && request.response.data.code === 503) {
                return reply(request.response.data.message ? request.response.data.message : "Service temporary unavailable.").code(503);
            }
        }
        
        return reply.continue();
    });
    
    next();
}

register.attributes = {
    name: "errorHandler",
    once: true
}

module.exports = register;