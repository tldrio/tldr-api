/**
 * Admin route to make a tldr undiscoverable
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var Tldr = require('../lib/models').Tldr
  , i18n = require('../lib/i18n');


module.exports = function (req, res, next) {

  var id = req.params.id;

  Tldr.makeUndiscoverable(id , function (err) {
    if (err) {
      res.send(i18n.makeUndiscoverableFailure);
    } else {
      res.send(i18n.makeUndiscoverableOk);
    }
  });
}

