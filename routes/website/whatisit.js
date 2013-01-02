/**
 * /whatisit page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config');

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.whatisit = true;
  values.title = "What is this?" + config.titles.branding + config.titles.shortDescription;
  partials.content = '{{>website/pages/whatisit}}';

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}

