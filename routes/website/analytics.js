/**
 * /account page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config');

module.exports = function (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    ;

  partials.content = '{{>website/pages/analytics}}';
  values.title = (values.loggedUser ? values.loggedUser.username : '') + " - How badass are you?" + config.titles.branding;

  values.past30Days = {};
  value.allTime = {};



  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}

