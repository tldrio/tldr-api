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
    config = require('./lib/config.js'),
		PORT = config.PORT_DEV;

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());


server.get('/hello', function(req, res, next) {
  res.send('hello ');
  logger.info('handle hello request');
});
server.get('/test', function(req, res, next) {
  res.send('test');
  logger.info('handle test request');
});

server.get('/', function(req, res, next) {
  res.send('test');
  logger.info('handle test request');
});

// Start server
if (module.parent === null) {
	server.listen(PORT, function(){
		logger.info('Server launched at '+ server.url);
	});
}

//var client = restify.createJsonClient({
  //url: 'http://localhost:' + PORT,
//});

//client.get('/hello', function(err, req, res, obj) {

		//console.log('in client');
		//console.log(JSON.stringify(obj, null, 2));
//});


module.exports = server;
