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

  values.tldr1 = { _id: 'fakeTldrId1'
                 , hostname: 'theregister.co.uk'
                 , title: 'Internet Explorer becomes Korean election issue'
                 , creator: { username: 'rocket747' }
                 , summaryBullets: []
                 };

  values.extension = true;
  values.chrome = chrome;
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

