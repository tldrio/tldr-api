/**
 * Restify server for Tldr
 *
 */


var restify = require('restify'),
    // Custom logger built with Winston
    winston = require('./lib/logger.js').winston,
    // Bunyan Logger for restify integration
    bunyan = require('./lib/logger.js').bunyan,
    // Instantiate server from restify
    server = restify.createServer(),
    // Port to connect to server
    PORT = 8787;

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());



// Start server
server.listen(PORT, function(){
  winston.info('Server launched');
});



