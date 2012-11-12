/**
 * /index page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var renderLatestTldrs = require('./summaries')
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.index = true;
  partials.content = '{{>website/pages/index}}';

  if (req.user) {
    renderLatestTldrs(req, res, next);
  } else {
    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  }
}
