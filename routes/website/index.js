/**
 * / page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config')
  , app = require('../../app')
  , _s = require('underscore.string')
  ;

module.exports = function (req, res, next) {
  app.getTotalTldrReadCount(function (err, totalReadCount) {
    var values = req.renderingValues || {}
      , partials = req.renderingPartials || {};

    values.index = true;
    values.rssFeedPromotionLink = true;
    values.totalReadCount = _s.numberFormat(totalReadCount);
    values.title = "tldr.io" + config.titles.shortDescription;
    values.description = "Save time and discover great content by reading and writing summaries of the best of the web.";
    partials.content = '{{>website/pages/index}}';

    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });
}
