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
  , items: [
             "Enabled anonymous posting, you can now help the community in a more discreet way. Of course, people can still thank you for your work."
           , "Various improvements to the contribution UX: better positioned window, more intuitive behaviour of the tab command and better post contribution message."
           , "Embed tldrs in Reddit comments pages"
           , "Badges now appear on pinboard.in/popular and pinboard.in/recent"
           , "Improved the design of the tldrs embedded in Hacker News and Reddit."
           ]
  });

  values.weeklyReleases.push({ header: 'Week from Feb 11th, 2013 to Feb 17th, 2013'
  , items: [
             "Embed tldrs in Hacker News comments pages."
           , "You can now thank the creator of a summary."
           , "Fixed indexing problems for Blogspot webapges"
           , "New 'read later on Readability' button."
           , "Various bugfixes: signup page, read report email, tldr page"
           ]
  });


  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}
