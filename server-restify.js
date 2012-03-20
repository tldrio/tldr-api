/**
 * Restify server for Tldr
 *
 */


var restify = require('restify'),
    // Custom logger built with Winston
    logger = require('./logger.js'),
    // Instantiate server from restify
    server = restify.createServer({
      name: 'Tldr-proto',
    }),
    // Port to connect to server
    PORT = 8787;

logger.warn('Test Warn');
logger.debug('Test Debug');
logger.info('Test info');
logger.error('Test error');

//Hanlding annoying favicon request in Chrome
server.get('/favicon.ico', function(req, res, next){
  logger.info('querying favicon');
  res.end();
});

// Start server
server.listen(PORT, function(){
  logger.info(server.name + ' listening at ' + server.url);
});



