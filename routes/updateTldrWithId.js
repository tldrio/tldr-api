var bunyan = require('../lib/logger').bunyan
  , Tldr = require('../lib/models').Tldr
  , i18n = require('../lib/i18n')
  , helpers = require('./helpers');


function updateTldrWithId (req, res, next) {
  var id = req.params.id;

  if (!req.body) {
    return next({ statusCode: 400, body: { message: i18n.bodyRequired} } );
  }

  // Increment readcount if body contains the key `incrementReadCount`
  // Usefull for increment readCOunt on hover in the extension
  if (req.body.incrementReadCount) {
    Tldr.findOneById(id, function (err, tldr) {
      if (err) {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateTldr} } );
      }
      return res.send(204);
    }) ;
    return;
  }

  if (!req.user) {
    return next({ statusCode: 401, body: { message: i18n.needToBeLogged} } );
  }

  // We find by id here
  Tldr.find({ _id: id }, function (err, docs) {
    helpers.updateCallback(err, docs, req, res, next);
  });

}

// Module interface
module.exports = updateTldrWithId;
