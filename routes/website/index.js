/**
 * /index page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.index = true;
  values.description = "Save time and discover great content by reading and writing summaries of the best of the web.";
  partials.content = '{{>website/pages/index}}';

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}
