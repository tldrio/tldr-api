/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , Tldr = require('../lib/models').Tldr
  , mailer = require('../lib/mailer')
  , mqClient = require('../lib/message-queue')
  , i18n = require('../lib/i18n');


function thankContributor (req, res, next) {
  var id = req.params.id;

  if (!req.user) {
    return next({ statusCode: 401, body: { message: i18n.needToBeLogged} } );
  }

	Tldr.findOne({ _id: id })
      .populate('creator')
      .exec(function (err, tldr) {
    if (err) {
      return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateTldr} } );
    }
    tldr.thank( req.user, function (err, tldr) {
      if (err) { return next(i18n.se_thanking); }

      mqClient.emit('tldr.thank', { thanker: req.user, tldr: tldr });
      return res.json(200, tldr);
    });
  }) ;

}

// Module interface
module.exports = thankContributor;
