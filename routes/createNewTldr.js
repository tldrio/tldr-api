var bunyan = require('../lib/logger').bunyan
  , normalizeUrl = require('../lib/customUtils').normalizeUrl
  , models = require('../lib/models')
  , i18n = require('../lib/i18n')
  , helpers = require('./helpers')
  , config = require('../lib/config')
  , mailer = require('../lib/mailer')
  , _ = require('underscore')
  , mqClient = require('../lib/message-queue')
  , Tldr = models.Tldr;


function createNewTldr (req, res, next) {
  var tldrToSend
    , url;

  if (!req.user) { return res.json(401, { message: i18n.needToBeLogged }); }

  Tldr.createAndSaveInstance(req.body, req.user, function (err, tldr) {
    if (err) {
      if (err.errors) { return res.json(403, models.getAllValidationErrorsWithExplanations(err.errors)); }
      if (err.code !== 11000 && err.code !== 11001) { return res.json(500, { message: i18n.mongoInternErrCreateTldr }); }

      // POST on existing resource so we act as if it's an update
      url = normalizeUrl(req.body.url);
      Tldr.find({ possibleUrls: url }, function (err, docs) {
        helpers.updateCallback(err, docs, req, res, next);
      });
    } else {
      mailer.sendEmail({ type: 'adminTldrWasCreatedOrEdited'
                       , development: false
                       , values: { user: req.user
                                 , tldr: tldr
                                 , type: 'Created'
                                 , message: req.user.isAdmin ? 'Please cockslap Charles' : 'A tldr was created' }
                       });

      // If this is the creator's first tldr, send him a congratulory email
      if (req.user.tldrsCreated.length === 1) {
        // Send congratulory email
        mailer.sendEmail({ type: 'congratulationsFirstTldr'
                         , to: req.user.email
                         , development: false
                         , values: { tldr: tldr, user: req.user }
                         });
      }

      // Return the complete tldr with all populations
      Tldr.findOneById(tldr._id, function (err, tldr) {
        return res.json(201, tldr);
      });
    }
  });
}


// Module interface
module.exports = createNewTldr;
