/**
 * Restify server for Tldr
 *
 */


var restify = require('restify'),
    // Custom logger built with Winston
    winston = require('./lib/logger.js').winston,
    // Bunyan Logger for restify integration
    bunyan = require('./lib/logger.js').bunyan,
    // Port to connect to server
    config = require('./lib/config.js');

var server = restify.createServer(),
		PORT = config.PORT_DEV;


server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());


server.get('/hello', function(req, res, next) {
  res.send('hello toto');
  winston.info('handle hello request');
});


// Start server
if (module.parent === null) {
	server.listen(PORT, function(){
		winston.info('Server launched at '+ server.url);
	});
}

module.exports = server;
