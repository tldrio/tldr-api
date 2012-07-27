var server = require('./serverConfig.js')
  , requestHandlers = require('./requestHandlers')
  , bunyan = require('./lib/logger').bunyan; // Audit logger for express

/**
 * Routes /users/
 *
 */

// User creation
server.post('/users', requestHandlers.createNewUser);

// Get/set personal information
server.get('/users/you', requestHandlers.getLoggedUser);
server.get('/users/you/newValidationCode', requestHandlers.requestNewValidationCode);
server.get('/users/you/createdtldrs', requestHandlers.getLoggedUserCreatedTldrs);
server.get('/users/validate', requestHandlers.validateUserEmail);

server.put('/users/you', requestHandlers.updateUserInfo);

// Handles a user connection and credentials check. 
server.post('/users/login',
  server.passport.authenticate('local'),
  function (req, res, next) {
    return res.json(200, req.user.getAuthorizedFields());
  }
);

server.get('/users/logout', requestHandlers.logUserOut);


/**
 * Routes /tldrs/
 *
 */

// Search tldrs
server.get('/tldrs/search', requestHandlers.searchTldrs);
server.get('/tldrs', requestHandlers.searchTldrs); // Convenience route

// GET latest tldrs (convenience route)
server.get('/tldrs/latest/:quantity', requestHandlers.getLatestTldrs);

// GET a tldr by id
server.get('/tldrs/:id', requestHandlers.getTldrById);

//POST create tldr
server.post('/tldrs', requestHandlers.postNewTldr);

//PUT update tldr
server.put('/tldrs/:id', requestHandlers.putUpdateTldrWithId);



/*
 * Connect to database, then start server
 */
if (module.parent === null) { // Code to execute only when running as main
  server.db.connectToDatabase(function() {
    bunyan.info('Connection to database successful');

    server.listen(server.set('svPort'), function (){
      bunyan.info('Server %s launched in %s environment, on port %s', server.name, server.set('env'), server.set('svPort'));
    });
  });
}



// exports
module.exports = server;
