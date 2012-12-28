/**
 * /tldrscreated page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config');

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {}
    ;

  partials.content = '{{>website/pages/tldrscreated}}';
  values.title = (values.loggedUser ? values.loggedUser.username : '') + " - tldrs you created | tldr.io";

  values.loggedUser.getCreatedTldrs(function(err, tldrs) {
    values.tldrsCreated = tldrs;

    res.render('website/basicLayout', { values: values
               , partials: partials
    });
  });
}


