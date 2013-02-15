/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , Tldr = require('../lib/models').Tldr
  , mailer = require('../lib/mailer')
  , normalizeUrl = require('../lib/customUtils').normalizeUrl
  , i18n = require('../lib/i18n');

/**
 * Returns a search of tldrs (through route /tldrs/search)
 */
function searchTldrs (req, res, next) {
  var url = req.query.url;

  Tldr.findOneByUrl(url, function (err, tldr) {
    if (err) {
      return next({ statusCode: 500, body: { message: i18n.mongoInternErrGetTldrUrl} } );
    }

    if (!tldr) {
      // Advertise admins there is a summary emergency
      // Only done for official clients (bookmarklet and chrome extension)
      if (req.clientIsOfficial && req.user && !req.user.isAdmin) {
        //mailer.sendEmail({ type: 'adminSummaryEmergency'
                         //, development: false
                         //, values: { url: url, user: req.user }
                         //});
      }

      return next({ statusCode: 404, body: { message: i18n.resourceNotFound} } );
    }

    // Success
    return res.json(200, tldr);
  });
}

module.exports = searchTldrs;
