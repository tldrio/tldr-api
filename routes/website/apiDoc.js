/**
 * /api-documentation page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config')

module.exports = function (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    ;

  values.title = "Developpers" + config.titles.branding + config.titles.shortDescription;
  values.description = "Documentation for our API.";
  partials.content = '{{>website/pages/apiDoc}}';

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}


