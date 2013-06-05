/**
 * Admin route to accept a tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var Tldr = require('../lib/models').Tldr
  , mqClient = require('../lib/message-queue')
  , i18n = require('../lib/i18n');


module.exports = function (req, res, next) {

  var id = req.params.id;

  Tldr.moderateTldr(id , function (err) {
    if (err) {
      res.send(500, i18n.moderateTldrFailure);
    } else {
      mqClient.emit('tldr.moderated', { tldrId: id });
      res.send(200, i18n.moderateTldrSuccess);
    }
  });
};


