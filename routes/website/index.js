/**
 * /index page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var values = {};

  values.user = req.user;
  values.index = true;

  res.render('website/basicLayout', { values: values
                                    , partials: { content: '{{>index}}' }
                                    });
}
