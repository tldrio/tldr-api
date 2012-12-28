/**
 * /account page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    ;

  partials.content = '{{>website/pages/account}}';
  values.title = (values.loggedUser ? values.loggedUser.username : '') + " - manage my account | tldr.io";

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}

