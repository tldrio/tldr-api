/**
 * /index page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config')

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.index = true;
  values.title = "tldr.io" + config.titles.shortDescription;
  partials.content = '{{>website/pages/index}}';

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}
