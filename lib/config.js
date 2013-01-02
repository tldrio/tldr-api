var express = require('express')
  , RedisStore = require('connect-redis')(express)   // Will manage the connection to our Redis store
  , env = process.env.NODE_ENV || 'development'
  , pageTemplates = process.env.TLDR_PAGE_TEMPLATES
  // Common config parameters
  , config = {
      dbHost: 'localhost'
    , dbPort: 27017
    , pageTemplates: pageTemplates
    , slugSize: 70
    , templatesDir: 'templates'
    , thresholdCongratsTldrViews: 100
    , unsubscribeExpDays: 2
    , redisQueue: { port: 6379
                  , db: 2 }
    , titles: { branding: ' | tldr.io'
              , shortDescription: ' - Interesting content summarized by people'}
  };

switch(env) {
  case 'development':
    config.env = 'development';
    config.dbName = 'dev-db';
    config.svPort = 8787;
    config.apiUrl = 'http://localhost:8787';
    config.origin = 'localhost:8888';   // The protocol is determined on a per request basis
    config.websiteUrl = 'http://localhost:8888';
    config.cookieMaxAge = 2*24*3600*1000;
    config.redisDb = 0 ;
    config.bcryptRounds = 6;
    config.dbguiUrl = 'http://localhost:2762';
    break;

  case 'production':
    config.env = 'production';
    config.dbName = 'prod-db';
    config.svPort = 9001;
    config.apiUrl = 'http://api.tldr.io';
    config.origin = 'tldr.io';   // The protocol is determined on a per request basis
    config.websiteUrl = 'http://tldr.io';
    config.cookieMaxAge = 365*24*3600*1000;
    config.cookieDomain = '.tldr.io';
    config.redisDb = 0;
    config.bcryptRounds = 6;
    config.dbguiUrl = 'https://dbgui.tldr.io';
    break;

  case 'staging':
    config.env = 'staging';
    config.dbName = 'prod-db';
    config.svPort = 9002;
    config.apiUrl = 'http://api.tldr.io/staging';
    config.origin = 'staging.tldr.io';   // The protocol is determined on a per request basis
    config.websiteUrl = 'http://staging.tldr.io';
    config.cookieMaxAge = 365*24*3600*1000;
    config.cookieDomain = '.tldr.io';
    config.redisDb = 0;
    config.bcryptRounds = 6;
    config.dbguiUrl = 'https://dbgui.tldr.io';
    break;

  case 'test':
    config.env = 'test';
    config.dbName = 'test-db';
    config.svPort = 8686;
    config.apiUrl = 'http://localhost:8787';
    config.origin = 'http://localhost:8888';   // The protocol is determined on a per request basis
    config.websiteUrl = 'http://localhost:8888';
    config.cookieMaxAge = 120*1000;
    config.redisDb = 9;
    config.bcryptRounds = 2;
    break;

  case 'testMail':
    config.env = 'testMail';
    config.dbName = 'test-db';
    config.svPort = 8686;
    config.apiUrl = 'http://localhost:8787';
    config.origin = 'http://localhost:8888';   // The protocol is determined on a per request basis
    config.websiteUrl = 'http://localhost:8888';
    config.cookieMaxAge = 120*1000;
    config.redisDb = 9;
    config.bcryptRounds = 2;
    break;

}

config.session = { secret: 'this is da secret, dawg'    // Used for cookie encryption
                           , key: 'tldrsess'                  // Name of our cookie
                           , cookie: { path: '/'                  // Cookie is resent for all pages. Strange: there was a bug when I used '/users'
                                                                  // Anyway since connect-session can be pretty stupid, any call outside /users created a new
                                                                  // entry in the Redis store, which is a dumb memory leak. Adding xhr: {withCredentials: true}
                                                                  // to the parameters of the $.ajax client calls enables the same session for all calls, thus
                                                                  // eliminating the memory leak
                                     , httpOnly: false            // false so that it can be accessed by javascript, not only HTTP/HTTPS
                                     , maxAge: config.cookieMaxAge     // Sets a persistent cookie (duration in ms)
                                                                  // The TTL of the Redis Session is set to the same period, and reinitialized at every 'touch',
                                                                  // i.e. every request made that resends the cookie
                                     }
                           , store: new RedisStore({ db: config.redisDb }) // 'db' option is the Redis store to use
};


/*
 * In staging and production, cookies are set for tldr.io and all its subdomains
 */
if (config.cookieDomain) {
  config.session.cookie.domain = config.cookieDomain;
}


module.exports = config;
