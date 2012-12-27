/**
 * /whatisit page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.whatisit = true;
  values.description = "tldr.io lets you read man-written summaries of content so you can easily select what you want to read, and skim the rest.";
  partials.content = '{{>website/pages/whatisit}}';

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}

