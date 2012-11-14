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
  console.log('ALKASJ',AB);
  // AB testing
  if (AB) {
    values.versionA = true;
    values.version = 'bitching to get email';
  } else {
    values.versionB = true;
    values.version = 'directly';
  }
  values.title = "See through hyperlinks with our Chrome extension for Hacker News - tldr.io";

  res.render('website/basicLayout', { values: values
                                    , partials: { content: '{{>website/pages/extension}}' }
                                    });
}

