/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , i18n = require('../lib/i18n');


/*
 * Returns the tldrs created by the logged user. If nobody is logged, returns a 401.
 */
function getCreatedTldrs(req, res, next) {
  if (req.user) {
    req.user.getCreatedTldrs(function(err, tldrs) {
      return res.json(200, tldrs);
    });
  } else {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }
}



// Modumodelsle interface
module.exports = getCreatedTldrs;
