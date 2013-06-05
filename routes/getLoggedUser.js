/**
 * Request Handler to get the logged user
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , i18n = require('../lib/i18n');


/*
 * Returns the logged user if there is a logged user, or a 401 error if nobody is logged
 */
function getLoggedUser(req, res, next) {
  if (req.user) {
    req.user.updateLastActive( function () {
      res.json(200, req.user.getAuthorizedFields());
    });
  } else {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }
}


// Module interface
module.exports = getLoggedUser;
