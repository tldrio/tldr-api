/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var Tldr = require('../lib/models').Tldr
  , i18n = require('../lib/i18n');


/**
 * private method to delete tldr
 */

function deleteTldr (req, res, next) {

  var id = req.params.id;

  Tldr.remove({ _id: id }, function (err) {
    if (err) {
      res.send('error when deleting tldr');
    } else {
      res.send('tldr deleted');
    }
  });
}

// Module interface
module.exports = deleteTldr;
