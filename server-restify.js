/**
 * Restify server for Tldr
 *
 */


var restify = require('restify'),
    // Winston is a logging module - part of Flatiron
    winston = require('winston'),
    // Config object for logger
    logger_config = {
                      "levels" : {
                        "detail": 0,
                        "trace": 1,
                        "debug": 2,
                        "enter": 3,
                        "info": 4,
                        "warn": 5,
                        "error": 6
                      },
                      "colors" : {
                        "detail": "grey",
                        "trace": "white",
                        "debug": "blue",
                        "enter": "inverse",
                        "info": "green",
                        "warn": "yellow",
                        "error": "red"
                      } 
                    },
    // Instantiate server from restify
    server = restify.createServer({
      name: 'Tldr-proto',
    }),
    // Instantiate Logger
    logger = new(winston.Logger)({
      transports: [new (winston.transports.Console)({
                          colorize:true}),],
      levels: logger_config.levels,
      colors: logger_config.colors,
    }),
    // Port to connect to server
    PORT = 8787;

logger.warn('Test Warn');
logger.debug('Test Debug');
logger.info('Test info');
logger.error('Test error');


// Start server
server.listen(PORT, function(){
  logger.info(server.name + ' listening at ' + server.url);
});



