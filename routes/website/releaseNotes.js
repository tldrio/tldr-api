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

  values.weeklyReleases.push({ header: 'Week from Mar 4th, 2013 to Mar 10th, 2013'
  , items: [
             "Contributors now enjoy their analytics report, telling them how much time they saved the community, how many times they were thanked and various other metrics."
           , "You can now embed a tldr in any webpage."
           , "A tldr made on the Readability version of an article is now also available when you view the original article."
           , "The tldrs on the 'Tldrs you created' page now have permalinks."
           , "Contributors can now delete their own tldrs, if they haven't been edited or moderated yet."
           , "You can now delete your user account. We would be sad if you did though!"
           , "Bugfixes: spinner during login with Google, autocomplete of credentials, don't display an ugly square in the tldr page if the image can't be fetched."
    ]
  });

  values.weeklyReleases.push({ header: 'Week from Feb 25th, 2013 to Mar 3st, 2013'
  , items: [
             "Calls from the extension to the API are now made in HTTPS for privacy reasons."
           , "You are now notified when someone edits a tldr you wrote. The email shows how your tldr was changed."
           , "Editors are now credited for their work too."
           , "You can now thank a tldr's creator on the tldr page."
           , "Bugfixes: missing error message when posting on forum failed, reset password procedure messages, websites styling polluted by the extension."
           ]
  });

  values.weeklyReleases.push({ header: 'Week from Feb 18th, 2013 to Feb 24th, 2013'
  , items: [
             "You can now post tldrs anonymously, in case you don't want your username publicly associated with the tldr."
           , "Various improvements to the contribution UX: better positioned window, more intuitive behaviour of the tab command and better post contribution message."
           , "Embed tldrs in Reddit comments pages."
           , "Badges now appear on pinboard.in/popular and pinboard.in/recent"
           , "Improved the design of the tldrs embedded in Hacker News and Reddit."
           ]
  });

  values.weeklyReleases.push({ header: 'Week from Feb 11th, 2013 to Feb 17th, 2013'
  , items: [
             "Embed tldrs in Hacker News comments pages."
           , "You can now thank the creator of a summary."
           , "Fixed indexing problems for Blogspot webpages."
           , "New 'read later on Readability' button."
           , "Bugfixes: signup page, read report email, tldr page."
           ]
  });

  values.weeklyReleases.push({ header: 'Week from Feb 4th, 2013 to Feb 10th, 2013'
  , items: [
             "You can now use your Google account to sign up and sign in."
           , "Stopped using all tldrs in the RSS feed, keep only the best."
           , "Improved tldr indexing, some tldrs were not showing in Hacker News as they should."
           , "Onboarding process for reading and contributing your first summary."
           , "Bugfixes: share box, automatic log in on sign up."
           ]
  });

  values.weeklyReleases.push({ header: 'Week from Jan 28th, 2013 to Feb 3rd, 2013'
  , items: [
             "Most tldrs now have an image."
           , "You can now enjoy the Chrome extension badges on Reddit, Longreads and Techmeme on top of Hacker News."
           , "You can now read our summaries on any platform, using the RSS feed."
           , "Every contribution earns you a funny picture (mostly lolcats for now)."
           , "Bugfixes: sign up within the extension, repaired some links from a tldr to the original webpage."
           ]
  });

  values.weeklyReleases.push({ header: 'Week from Jan 21th, 2013 to Jan 27th, 2013'
  , items: [
             "You can now use the Chrome Extension on any webpage to read or write its summary."
           , "Bugfixes: unreachable tldr pages, better separation of the tldr badges and the Hacker News front page."
           ]
  });

  values.weeklyReleases.push({ header: 'Week from Jan 14th, 2013 to Jan 20th, 2013'
  , items: [
             "Our API is now open in read-only mode."
           , "Bugfix: read report incoherent numbers."
           ]
  });

  values.weeklyReleases.push({ header: 'Week from Jan 2nd, 2013 to Jan 13th, 2013'
  , items: [
             "You can now edit your own posts in the forum."
           , "The website is now much more search engine and Facebook friendly."
           , "UX tweak: use only one tab keypress to jump from one bullet to the next in edit mode."
           , "Various small bugfixes."
           , "We'll post release notes weekly from now on."
           ]
  });

  values.weeklyReleases.push({ header: 'Week from Dec 10th, 2012 to Dec 25th, 2012'
  , items: [
             "We needed a simple and fast GUI to manage our Mongo database, and couldn't find one we liked. So we created and open-sourced <a href='https://github.com/tldrio/mongo-edit' target='_blank'>Mongo Edit</a>."
           , "See the read count on the tldr pages."
           , "You will now receive congratulory emails for tldrs read by a load of people."
           , "Tldr indexing now handles websites who don't redirect the www subdomain to @ (or @ to www)."
           , "The 'Read full article' is now more visible and higher in the tldr page."
           , "Bugfixes: styling of the creator's username in the extension, better copy of the read report."
           ]
  });

  values.weeklyReleases.push({ header: 'Week from Dec 3th, 2012 to Dec 9th, 2012'
  , items: [
             "Removed the notification page which made the site very slow and was not helpful at all."
           , "We've been busy with the <a href='http://www.seedcamp.com/' target='_blank'>Seedcamp</a> Paris event the rest of the week. Worked out well, tldr.io is now a Seedcamp company :)"
           ]
  });

  values.weeklyReleases.push({ header: 'Nov 14th, 2012'
  , items: [
             "We just finished our <a href='http://tldr.io/chrome-extension' target='_blank'>Chrome Extension</a>. Use it to read summaries of Hacker News links without leaving the frontpage!"
           ]
  });

  values.weeklyReleases.push({ header: 'Oct 3rd, 2012'
  , items: [
             "Hello World! We just launched our website and our summary creation tool. Use tldr.io to read sumamries of interesting content, written by people."
           ]
  });



  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}
