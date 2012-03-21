/**
 * Restify server for Tldr
 *
 */


var restify = require('restify'),
    // Custom logger built with Winston
    logger = require('./lib/logger.js').logger,
    // Bunyan Logger for restify integration
    blogger = require('./lib/logger.js').blogger,
    // Instantiate server from restify
    server = restify.createServer(),
    // Port to connect to server
    PORT = 8787;

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());



// Start server
server.listen(PORT, function(){
  logger.info('Server launched');
});



