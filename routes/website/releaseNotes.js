/**
 * /release-notes page of the website
 * Copyright (C) 2013 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config')

module.exports = function (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    , marked = require('../../lib/customMarked')
    ;

  values.title = "Release notes" + config.titles.branding + config.titles.shortDescription;
  values.description = "tldr.io release notes: things are moving fast, keep up by reading this page.";
  partials.content = '{{>website/pages/releaseNotes}}';

  values.weeklyReleases = [];

  values.weeklyReleases.push({ header: 'Week from Feb 18th, 2013 to Feb 24th, 2013'
  
  });

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}
