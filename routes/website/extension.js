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
    , config = require('../../lib/config')
    ;

  // Fake tldrs are called tldr1, ..., tldr5
  values.tldr1 = { _id: 'fakeTldrId1'
                 , hostname: 'theregister.co.uk'
                 , title: 'Internet Explorer becomes Korean election issue'
                 , creator: { username: 'rocket747' }
                 , summaryBullets: [ 'At the end of the 1990s, Korea decided to develop a home-grown SSL encryption standard (SEED) mandated for all online transactions.'
                                   , 'As it required ActiveX, it could only work with Internet Explorer, resulting in a decade-long monopoly for IE on banking, shopping and other transactional sites'
                                   , 'SEED was made optional in 2010 but is still widespread since government approval process for alternatives is too rigorous.'
                                   , 'Presidential hopeful Ahn Cheol-Soo wants to support alternatives and terminate SEED, so that Korea\'s Internet becomes free, open and fair.'
                                   ]
                 };

  values.tldr2 = { _id: 'fakeTldrId2'
                 , hostname: '37signals.com'
                 , title: 'Commercial Freedom'
                 , creator: { username: 'capslocker' }
                 , summaryBullets: [ "Selling software on the internet gives very broad commercial freedom."
                                   , "You can have access to world markets without paying imports or custom taxes, cut off the suppliers and talk direclty to the customers."
                                   , "You can build a product easily with open source tools with no capital and using simply self promotion to build a brand."
                                   , "You can also learn to build software basically for free."
                                   ]
                 };

  values.tldr3 = { _id: 'fakeTldrId3'
                 , hostname: 'salon.com'
                 , title: 'Bring back the 40-hour work week'
                 , creator: { username: 'stan' }
                 , summaryBullets: [ "Recently working more than 40 hours per week has become cool again, and most people expect to work north of 50 hours per week in a serious job."
                                   , "People seem to have forgotten that the 40-hour work week emerged because business leaders observed total output per worker decreased as longer weeks were worked"
                                   , "Studies have shown that briefly increasing the work week to 60 or 70 hours can lead to more output. However overtime won't be as productive as the first 40"
                                   , "The fact that a job is not physical doesn't mean the worker can work longer hours. Putting in more than 5 or 6 productive mental work per day is near impossible"
                                   , "Bringing back the 40-hour work week is going to require a wholesale change of attitude on the part of both employees and employers."
                                   ]
                 };


  values.tldr4 = { _id: 'fakeTldrId4'
                 , hostname: 'arstechnica.com'
                 , title: 'Google Fiber is live in Kansas City, real-world speeds at 700 Mbps'
                 , creator: { username: 'Louis' }
                 , summaryBullets: [ "Google Fiber is now live in Kansas City, offering 1 Gbps speeds for $70 per month, significantly faster and cheaper than traditional American ISPs."
                                   , "But fiber is not enough to make for a successful startup scene, you need a community."
                                   ]
                 };


  values.tldr5 = { _id: 'fakeTldrId5'
                 , hostname: 'notsureifserious.com'
                 , title: 'Show HN: My Life Project, Kickstarter for Dogs'
                 , creator: { username: 'samwer' }
                 , summaryBullets: [ "I love dogs and I want them to be able to fund the projects they like. That's why I created Kickstarter for dogs."
                                   , "It's free for dogs but plans for dog owners start at $100/month. If you love your dog there's never been a better opportunity to prove it."
                                   ]
                 };


  values.extension = true;
  values.description = "Chrome extension that lets you read summaries of articles posted to Hacker News without leaving the front page";
  values.chrome = chrome;
  // AB testing
  if (AB) {
    values.versionA = true;
    values.version = 'bitching to get email';
  } else {
    values.versionB = true;
    values.version = 'directly';
  }
  values.title = "See through hyperlinks with our Chrome extension for Hacker News" + config.titles.branding;
  values.installed = req.query.installed;

  res.render('website/basicLayout', { values: values
                                    , partials: { content: '{{>website/pages/extension}}' }
                                    });
}

