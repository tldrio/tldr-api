/**
 * /signup page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var values = req.renderingValues || {};
  values.signup = true;
  values.title = "Sign up in 20 seconds | tldr.io - Man-written summaries of interesting content";
  res.render('website/basicLayout', { values: values
                                    , partials: { content: '{{>website/pages/signup}}' }
                                    });
}

