/**
 * /whatisit page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var values = req.renderingValues;
  values.whatisit = true;

  res.render('website/basicLayout', { values: values
                                    , partials: { content: '{{>website/pages/whatisit}}' }
                                    });
}

