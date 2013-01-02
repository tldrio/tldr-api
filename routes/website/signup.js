/**
 * /signup page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config')

module.exports = function (req, res, next) {
  var values = req.renderingValues || {};
  values.signup = true;
  values.title = "Sign up in 20 seconds" + config.titles.branding + config.titles.shortDescription;
  values.description = "Sign up for tldr.io, it's free and takes 20 seconds.";
  res.render('website/basicLayout', { values: values
                                    , partials: { content: '{{>website/pages/signup}}' }
                                    });
}

