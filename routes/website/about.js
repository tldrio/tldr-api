/**
 * /about page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var partials = req.renderingPartials || {};

  partials.content = '{{>website/pages/about}}';

  res.render('website/basicLayout', { values: req.renderingValues
                                    , partials: partials
                                    });
}

