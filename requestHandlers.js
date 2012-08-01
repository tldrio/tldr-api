/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('./lib/logger').bunyan
  , _ = require('underscore')
  , mailer = require('./lib/mailer')
  , server = require('./serverConfig')
  , normalizeUrl = require('./lib/customUtils').normalizeUrl
  , models = require('./models')
  , Tldr = models.Tldr
  , User = models.User;


/**
 * Convenience route for latest tldrs
 *
 */
function getLatestTldrs (req, res, next) {
  var quantity = req.params.quantity
    , newReq = req;
  newReq.query.quantity = quantity;
  searchTldrs(newReq, res, next);
}


/**
 * Returns a search of tldrs (through route /tldrs/search)
 * You can specify which tldrs you want with the following parameters in the URL
 * Currently the olderthan parameter has priority over the startat parameter
 * @param {Integer} quantity quantity of tldrs to be fetched. Can't be greater than 10 (Optional - default: 10)
 * @param {Integer} startat Where to start looking for tldrs. 0 to start at the latest, 5 to start after the fifth latest and so on (Optional - default: 0)
 * @param {Integer} olderthan Returned tldrs must be older than this date, which is expressed as the number of milliseconds since Epoch - it's given by the Date.getTime() method in Javascript (Optional - default: now)
 * @param {String} url If set, this handler will return the tldr (if any) whose url is the url parameter
 *
 * If both startat and olderthan are set, we use olderthan only.
 */
function searchTldrs (req, res, next) {
  var query = req.query
    , url = query.url
    , defaultLimit = 10
    , limit = query.quantity || defaultLimit
    , startat = query.startat || 0
    , olderthan = query.olderthan;


  // If we have a url specified we don't need to go further just grab the
  // corresponding tldr
  if (url) {
    url = normalizeUrl(url);
    Tldr.find({url: url}, function (err, docs) {
      if (err) {
        return next({ statusCode: 500, body: { message: 'Internal Error while getting Tldr by url' } } );
      }

      if (docs.length === 0) {
        return next({ statusCode: 404, body: { message: 'ResourceNotFound' } } );
      }

      // Success
      internalContentNegotiationForTldr(req, res, docs[0]);

    });

    return;
  }

  // Check that limit is an integer and clip it between 1 and defaultLimit
  if (isNaN(limit)) { limit = defaultLimit; }
  limit = Math.max(0, Math.min(defaultLimit, limit));
  if (limit === 0) { limit = defaultLimit; }

  if (olderthan) {
    // olderthan should be an Integer. If not we use the default value (now as the number of milliseconds since Epoch)
    if (isNaN(olderthan)) { olderthan = (new Date()).getTime(); }

    Tldr.find({})
     .sort('updatedAt', -1)
     .limit(limit)
     .lt('updatedAt', olderthan)
     .exec(function(err, docs) {
       if (err) {
         return next({ statusCode: 500, body: {message: 'Internal Error executing query' } });
       }

       res.json(200, docs);
     });


  } else {
    // startat should be an integer and at least 0
    if (isNaN(startat)) { startat = 0; }
    startat = Math.max(0, startat);

    Tldr.find({})
     .sort('updatedAt', -1)
     .limit(limit)
     .skip(startat)
     .exec(function(err, docs) {
       if (err) {
         return next({ statusCode: 500, body: {message: 'Internal Error executing query' } });
       }
       // Example of how the function is used
       bunyan.incrementMetric('latestCalled', req);
       res.json(200, docs);
     });
  }
}


/**
 * GET /tldrs/:id
 * We query tldr by id here
 */

function getTldrById (req, res, next) {

  var id = req.params.id;

  Tldr.findById( id, function (err, tldr) {
    if (err) {
      // If err.message is 'Invalid ObjectId', its not an unknown internal error but the ObjectId is badly formed (most probably it doesn't have 24 characters)
      // This API may change (though unlikely) with new version of mongoose. Currently, this Error is thrown by:
      // node_modules/mongoose/lib/drivers/node-mongodb-native/objectid.js
      if (err.message === 'Invalid ObjectId') {
        return next({ statusCode: 403, body: { _id: 'Invalid tldr id supplied' } } );
      } else {
        return next({ statusCode: 500, body: { message: 'Internal Error while getting Tldr by Id' } } );
      }
    }
    if(!tldr){
      // There is no record for this id
      return next({ statusCode: 404, body: { message: 'ResourceNotFound' } } );
    }

    internalContentNegotiationForTldr(req, res, tldr);

  });
}

function internalContentNegotiationForTldr (req, res, tldr) {
    if (req.accepts('text/html')) {
      return res.render('page', tldr); // We serve the tldr Page
    } else {  // Send json by default
      return res.json(200, tldr); // We serve the raw tldr data
    }
}


/**
 * Convenience function to factor code betweet PUT and POST on
 * already existing tldr
 *
 */

function internalUpdateCb (err, docs, req, res, next) {

  var oldTldr;

  if (err) {
    if (err.message === 'Invalid ObjectId') {
      return next({ statusCode: 403, body: { _id: 'Invalid tldr id supplied' } } );
    } else {
      return next({ statusCode: 500, body: { message: 'Internal Error while getting Tldr by url' } } );
    }
  }

  if (docs.length === 1) {
    oldTldr = docs[0];

    oldTldr.updateValidFields(req.body, function (err, updatedTldr) {
      if (err) {
        if (err.errors) {
          return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
        }
        return next({ statusCode: 500, body: { message: 'Internal Error while updating Tldr' } } );
      }

      // With 204 even if a object is provided it's not sent by express
      return res.send(204);
    });
  } else {
    return next({ statusCode: 404, body: { message: 'ResourceNotFound' } } );
  }
}



/**
 * Handles POST /tldrs
 * create new tldr, as per the spec
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.6
 * oldest POST wins if there are concurrent POSTs
 *
 */

function postNewTldr (req, res, next) {

  if (!req.body) {
    return next({ statusCode: 400, body: { message: 'Body required in request' } } );
  }

  Tldr.createAndSaveInstance(req.body, function (err, tldr) {
    if (err) {
      if (err.errors) {
        return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
      } else if (err.code === 11000) { // code 11000 is for duplicate key in a mongodb index

        var url = normalizeUrl(req.body.url);

        Tldr.find({url: url}, function (err, docs) {
          internalUpdateCb(err, docs, req, res, next);
        });

      } else {
        return next({ statusCode: 500, body: { message: 'Internal Error while creatning Tldr ' } } );
      }

    } else {
      // If a user is logged, he gets to be the tldr's creator
      if (req.user) {
        models.setTldrCreator(tldr, req.user , function() { return res.json(201, tldr) } );
      } else {
        return res.json(201, tldr);
      }
    }
  });

}

/**
 * Handles PUT /tldrs/:id
 * updates the tldr, as per the spec
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.6
 *
 */

function putUpdateTldrWithId (req, res, next) {

  var id = req.params.id;

  if (!req.body) {
    return next({ statusCode: 400, body: { message: 'Body required in request' } } );
  }

  // We find by id here
  Tldr.find({ _id: id }, function (err, docs) {
    internalUpdateCb(err, docs, req, res, next);
  });

}


/*
 * Creates a user if valid information is entered
 */
function createNewUser(req, res, next) {
  User.createAndSaveInstance(req.body, function(err, user) {
    if (err) {
      if (err.errors) {
        return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
      } else if (err.code === 11000) {   // Can't create two users with the same email
        return next({ statusCode: 409, body: { message: 'Login already exists' } } );
      } else {
        return next({ statusCode: 500, body: { message: 'Internal Error while creating new user account' } } );
      }
    }
    // Log user in right away after his creation
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      if (server.set('env') === 'test') {
        return res.json(201, user.getAuthorizedFields());
      } else if (server.set('env') === 'production' || server.set('env') === 'development' ) {

        mailer.sendConfirmationEmail(user, server.set('apiUrl'), function(error, response){
          if(error){
            bunyan.warn('Error sending confirmation email');
          }
        });
        return res.json(201, user.getAuthorizedFields());
      }
    });
  });
}


/*
 * Updates the logged user's info. First tries to update password if the request contains
 * password data, then updates the rest of the fields, and send back all errors or a success to the user
 */
function updateUserInfo(req, res, next) {
  // To be called after a password update, if any
  function updateEverythingExceptPassword(errors) {
    var errorsFromPasswordUpdate = errors || {};

    req.user.updateValidFields(req.body, function(err, user) {
      if (err) {
        if (err.errors) {
          // Send back a 403 with all validation errors
          return next({ statusCode:403, body: _.extend(models.getAllValidationErrorsWithExplanations(err.errors), errorsFromPasswordUpdate) });
        } else {
          return next({ statusCode: 500, body: { message: 'Internal Error while updating user info' } } );
        }
      }

      // If we have errors on password
      if (errors) {
        return next({ statusCode:403, body: errors });
      } else {
        return res.send(200, user.getAuthorizedFields());
      }
    });
  }

  if (req.user) {
    // First, check if user wants to modify username and password
    if (req.body.currentPassword && req.body.newPassword) {
      req.user.updatePassword(req.body.currentPassword, req.body.newPassword, function(err) {
        updateEverythingExceptPassword(err);   // We pass any error that we got from password update
      });
    } else {
      updateEverythingExceptPassword();   // No errors (yet)
    }
  } else {
    res.setHeader('WWW-Authenticate', 'UnknownUser');
    return res.json(401, { message: 'Unauthorized' } );
  }
}


/*
 * Returns the logged user if there is a logged user, or a 401 error if nobody is logged
 */
function getLoggedUser(req, res, next) {
  if (req.user) {
    res.json(200, req.user.getAuthorizedFields());
  } else {
    res.setHeader('WWW-Authenticate', 'UnknownUser');
    return res.json(401, { message: 'Unauthorized' } );
  }
}


/*
 * Returns the tldrs created by the logged user. If nobody is logged, returns a 401.
 */
function getLoggedUserCreatedTldrs(req, res, next) {
  if (req.user) {
    req.user.getCreatedTldrs(function(tldrs) {
      return res.json(200, tldrs);
    });
  } else {
    res.setHeader('WWW-Authenticate', 'UnknownUser');
    return res.json(401, { message: 'Unauthorized' } );
  }
}


/*
 * As name implies, logs user out
 */
function logUserOut(req, res, next) {
  var username = req.user ? req.user.username : null;

  req.logOut();

  if (username) {
    return res.json(200, { message: 'User ' + username + ' logged out successfully' });
  } else {
    return res.json(400, { message: 'No user was logged in!' });
  }
}

function createConfirmToken (req, res, next) {
  // User requested a new validation link
  if (req.user) {
    req.user.createConfirmToken( function (err, doc) {
      if (err) {
        return next({ statusCode: 500, body: { message: 'Internal error while updating new validation Code' } });
      }

      if (server.set('env') === 'test') {
          return res.json(200, { message: 'new validation link sent to ' + req.user.email});
      } else if (server.set('env') === 'production' || server.set('env') === 'development' ) {
        
        var link = server.set('websiteUrl') + '/account?confirmationToken=' +encodeURIComponent(doc.confirmationToken)
          , mailOptions = { from: "tl;dr <meta@tldr.io>" // sender address
                          , to: req.user.email // list of receivers
                          , subject: "Confirm your email address" // Subject line
                          , html: "Hi " + doc.username + ", <br/>" // plaintext body
                                + "You were so dumb that you lost our previous email so we generously generated a new validation link for you. <br/>"
                                + "Click on this <a href='"+ link +"' > " + link+ "></a> to validate your email address. <br/>"
                                + "See you on <a href='tldr.io'> tldr.io</a>"
                          , text: "Hi " + doc.username + "," // plaintext body
                                + "You were so dumb that you lost our previous email so we generously generated a new validation link for you. "
                                + "Copy this link: "+ link+" to in your browser's address bar to validate your email address. "
                                + "See you on tldr.io"
                          }

         //send mail with defined transport object
        mailer.sendMail(mailOptions, function(error, response){
          if(error){
            console.log(error);
            return next({ statusCode: 500, body: { message: 'Internal error while sending new validation code' } });
          }else{
            console.log("Message sent: " + response.message);
            return res.json(200, { message: 'new validation link sent to ' + req.user.email});
          }
        });
      }

    });
  } else {
    res.setHeader('WWW-Authenticate', 'UnknownUser');
    return res.json(401, { message: 'Unauthorized' } );
  }
}

function confirmUserEmail (req, res, next) {
  
  var confirmationToken = req.query.confirmationToken
    , email = req.query.email;

  if (!confirmationToken || !email) {
    return next({ statusCode: 400, body: { message: 'code parameter not provided' } } );
  }

  User.findOne({ email: email },  function (err, user) {
    if (err) {
      return next({ statusCode: 500, body: { message: 'Internal Error while getting Tldr by confirmationToken' } } );
    }

    // Check if user exists and confirmationToken matches
    if (!user || (user.confirmationToken !== confirmationToken)) {
      return next({ statusCode: 404, body: { message: 'We couldn\'t confirm your address. Link is invalid' } } );
    }

    var now = new Date();
    if (!user.confirmedEmail) {
      user.confirmedEmail = true;
      user.save(function (err) {
        if (err) {
          return next({ statusCode: 500, body: { message: 'Internal Error while saving user with new confirmEmail value' } } );
        }
        return res.redirect(server.set('websiteUrl') + '/account');
      });
    } else {
      return res.redirect(server.set('websiteUrl') + '/account');
    }

  });

}


// Module interface
module.exports.createNewUser = createNewUser;
module.exports.getLatestTldrs = getLatestTldrs;
module.exports.getLoggedUser = getLoggedUser;
module.exports.getLoggedUserCreatedTldrs = getLoggedUserCreatedTldrs;
module.exports.getTldrById = getTldrById;
//module.exports.handleErrors = handleErrors;
//module.exports.handleCORSLocal = handleCORSLocal;
//module.exports.handleCORSProd = handleCORSProd;
module.exports.logUserOut = logUserOut;
module.exports.putUpdateTldrWithId = putUpdateTldrWithId;
module.exports.postNewTldr = postNewTldr;
module.exports.createConfirmToken = createConfirmToken;
module.exports.searchTldrs = searchTldrs;
module.exports.updateUserInfo = updateUserInfo;
module.exports.confirmUserEmail = confirmUserEmail;
