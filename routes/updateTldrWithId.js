var bunyan = require('../lib/logger').bunyan
  , Tldr = require('../lib/models').Tldr
  , i18n = require('../lib/i18n')
  , helpers = require('./helpers')
  , mqClient = require('../lib/message-queue')
  , models = require('../lib/models')
  ;


function updateTldrWithId (req, res, next) {
  var id = req.params.id;

  // Increment readcount if body contains the key `incrementReadCount`
  // Usefull for increment readCount on hover in the extension
  if (req.body.incrementReadCount) {
    Tldr.findOneById(id, function (err, tldr) {
      return res.send(204);
    }) ;
    return;
  }

  if (!req.user) { return res.json(401, { message: i18n.needToBeLogged }); }

  Tldr.findOne({ _id: id }, function (err, tldr) {
    var oldTldrAttributes;

    if (!tldr) { return res.json(404,  { message: i18n.resourceNotFound }); }

    oldTldrAttributes = { summaryBullets: tldr.summaryBullets, title: tldr.title };

    tldr.updateValidFields(req.body, req.user, function (err, updatedTldr) {
      if (err) {
        if (err.errors) {
          return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
        } else {
          return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateTldr} } );
        }
      }

      mqClient.emit('tldr.edit', { editor: req.user, oldTldr: oldTldrAttributes, newTldr: updatedTldr });

      // We send back the completely populated tldr
      Tldr.findOneById(updatedTldr._id, function (err, tldrToSend) {
        return res.send(200, tldrToSend);
      });
    });
  });

}

// Module interface
module.exports = updateTldrWithId;
