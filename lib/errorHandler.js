var register = function(server, options, next) {
    server.ext('onPreResponse', function(request, reply) {
        if(request.response.isBoom) {
            if(request.response.data && request.response.data.code === 503) {
                return reply(request.response.data.message ? request.response.data.message : "Service temporary unavailable.").code(503);
            }
        }
    });
    
    next();
}

register.attributes = {
    name: "errorHandler",
    once: true
}

module.exports = register;