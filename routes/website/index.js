/**
 * / page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config')
  , app = require('../../app')
  , customUtils = require('../../lib/customUtils')
  , moment = require('moment')
  , _s = require('underscore.string')
  , r = require('ua-parser')
  ;

module.exports = function (req, res, next) {
  app.getTotalWordsSaved(function (err, totalWordsSaved) {
    var values = req.renderingValues || {}
      , partials = req.renderingPartials || {}
      , totalTimeSaved = customUtils.timeToRead(totalWordsSaved);

    values.index = true;
    values.rssFeedPromotionLink = true;
    values.coffeeBreaksSaved = _s.numberFormat(Math.floor(totalTimeSaved * 6));
    values.totalTimeSaved = moment.duration(totalTimeSaved, 'hours').humanize();
    values.title = "tldr.io" + config.titles.shortDescription;
    values.description = "Save time and discover great content by reading and writing summaries of the best of the web.";
    partials.content = '{{>website/pages/index}}';
    if (r.parse(req.headers['user-agent']).family === 'Firefox') {
      partials.installButton = '{{>website/addToFirefox}}';
    } else {
      partials.installButton = '{{>website/addToChrome}}';
    }

    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });
}
