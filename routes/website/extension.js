/**
 * /whatisit page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var values = req.renderingValues
    , ua = req.headers['user-agent']
    , chrome = ua.match(/Chrome/g)
    , AB = Math.floor( Math.random() * 2)
    ;

  values.extension = true;
  values.chrome = chrome;
  if (AB) {
    values.versionA = true;
    values.version = 'A';
  } else {
    values.versionB = true;
    values.version = 'B';
  }

  res.render('website/basicLayout', { values: values
                                    , partials: { content: '{{>website/pages/extension}}' }
                                    });
}

