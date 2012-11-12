/**
 * /whatisit page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var values = req.renderingValues
    , ua = req.headers['user-agent']
    , chrome = ua.match(/Chrome/g)
    ;

  values.chrome = chrome;

  res.render('website/basicLayout', { values: values
                                    , partials: { content: '{{>website/pages/extension}}' }
                                    });
}

