/**
 * /about page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config')

module.exports = function (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    ;

  values.title = "The team" + config.titles.branding + config.titles.shortDescription;
  values.description = "The tldr.io team is composed of Louis Chatriot, Stanislas Marion and Charles Miglietti.";
  partials.content = '{{>website/pages/about}}';

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}

