/**
 * Restify server for Tldr
 *
 */


/***********************************/
/* Require dependencies            */
/***********************************/
var restify = require('restify'),
    // Custom logger built with Winston
    winston = require('./lib/logger.js').winston,
    // Bunyan Logger for restify integration
    bunyan = require('./lib/logger.js').bunyan,
    // Port to connect to server
    config = require('./lib/config.js');

var server = restify.createServer(),
		PORT = config.PORT_DEV;


/***********************************/
/* Bundle Plugins Restify          */
/***********************************/
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

/********************/
/* Routing          */
/********************/


// Full tldrs list
server.get('/tldrs', function (req, res, next) {
  res.send(403, 'Dont dump the db fucking idiot');
});

/**
 * Get tldr identified by one id
 * @method {/tldrs/:id}
 * @return {Tldr Object} Returns the Tldr object corresponding to the
 *											 required id
 */


server.get('/tldrs/:id', function (req, res, next) {
	var tldr = {id: req.id, 
						  url:'needforair.com/Mofo',
							summary:'* Programming Mofo  '+
											'* Programming Mofo',
	};
  res.send(tldr);
});


/********************/
/* Start server     */
/********************/

// Start server
if (module.parent === null) {
	server.listen(PORT, function (){
		winston.info('Server launched at '+ server.url);
	});
}

module.exports = server;
