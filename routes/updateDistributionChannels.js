/**
 * Admin route to make a tldr undiscoverable
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var Tldr = require('../lib/models').Tldr
  , i18n = require('../lib/i18n');


module.exports = function (req, res, next) {
  Tldr.updateDistributionChannels(req.params.id, req.body , function (err) {
    if (err) {
      res.send(500, i18n.updateDistributionChannelsFailure);
    } else {
      res.send(200, i18n.updateDistributionChannelsSuccess);
    }
  });
};
