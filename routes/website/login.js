/**
 * /login page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var values = {};

  values.loggedUser = req.user;
  values.needToLogin = ! req.query.warning && req.query.returnUrl;   // A returnUrl means login was called because a non logged user tried to view a loggedInOnly page

  res.render('website/basicLayout', { values: values
                                    , partials: { content: '{{>website/pages/login}}' }
                                    });
}


