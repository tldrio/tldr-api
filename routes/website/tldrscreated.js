/**
 * /tldrscreated page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var values = req.renderingValues;

  values.loggedUser.getCreatedTldrs(function(tldrs) {
    values.tldrsCreated = tldrs;

    res.render('website/basicLayout', { values: values
               , partials: { content: '{{>website/pages/tldrscreated}}' }
    });
  });
}


