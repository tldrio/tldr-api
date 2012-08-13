/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , mailer = require('../lib/mailer')
  , config = require('../lib/config')
  , models = require('../lib/models')
  , i18n = require('../lib/i18n')
  , User = models.User;


/*
 * Creates a user if valid information is entered
 */
function createNewUser(req, res, next) {
  User.createAndSaveInstance(req.body, function(err, user) {
    if (err) {
      if (err.errors) {
        return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
      } else if (err.code === 11000 || err.code === 11001) {// code 1100x is for duplicate key in a mongodb index
        return next({ statusCode: 409, body: { duplicateField: models.getDuplicateField(err) } } );
      } else {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrCreateUser} } );
      }
    }
    // Log user in right away after his creation
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      if (config.env === 'test') {
        return res.json(201, user.getAuthorizedFields());
      } else if (config.env === 'production' || config.env === 'development' ) {

        mailer.sendConfirmToken(user, config.apiUrl, function(error, response){
          if(error){
            bunyan.warn('Error sending confirmation email', error);
          }
        });
        return res.json(201, user.getAuthorizedFields());
      }
    });
  });
}


// Module interface
module.exports = createNewUser;
