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
  bunyan.incrementMetric('users.creation.routeCalled');

  User.createAndSaveInstance(req.body, function(err, user) {
    if (err) {
      bunyan.incrementMetric('users.creation.error');

      if (err.errors) {
        return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
      } else if (err.code === 11000 || err.code === 11001) {// code 1100x is for duplicate key in a mongodb index
        return next({ statusCode: 409, body: { duplicateField: models.getDuplicateField(err) } } );
      } else {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrCreateUser} } );
      }
    }

    bunyan.incrementMetric('users.creation.success');
 
    // Log user in right away after his creation
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      mailer.sendConfirmToken(user, function(error, response){
        if(error){
          bunyan.warn('Error sending confirmation email', error);
        }
      });
      mailer.advertiseAdminNewUser(user, function(error, response){
        if(error){
          bunyan.warn('Error sending confirmation email', error);
        }
      });
      return res.json(201, user.getAuthorizedFields());
    });
  });
}


// Module interface
module.exports = createNewUser;
