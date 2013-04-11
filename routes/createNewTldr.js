var bunyan = require('../lib/logger').bunyan
  , models = require('../lib/models')
  , i18n = require('../lib/i18n')
  , config = require('../lib/config')
  , mailer = require('../lib/mailer')
  , _ = require('underscore')
  , mqClient = require('../lib/message-queue')
  , Tldr = models.Tldr
  , updateTldrWithId = require('./updateTldrWithId')
  , urlNormalization = require('../lib/urlNormalization')
  , normalizeUrl = urlNormalization.normalizeUrl
  ;


function createNewTldr (req, res, next) {
  var tldrToSend
    , url;

  if (!req.user) { return res.json(401, { message: i18n.needToBeLogged }); }

  Tldr.createAndSaveInstance(req.body, req.user, function (err, tldr) {
    if (err) {
      if (err.errors) { return res.json(403, models.getAllValidationErrorsWithExplanations(err.errors)); }
      if (err.code !== 11000 && err.code !== 11001) { return res.json(500, { message: i18n.mongoInternErrCreateTldr }); }

      url = normalizeUrl(req.body.url);
      return Tldr.findOne({ possibleUrls: url }, function (err, tldr) {
        req.params = { id: tldr._id };
        updateTldrWithId(req, res, next);
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
                         , values: { tldr: tldr, creator: req.user }
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
