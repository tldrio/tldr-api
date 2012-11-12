var express = require('express')
  , RedisStore = require('connect-redis')(express)   // Will manage the connection to our Redis store
  , env = process.env.NODE_ENV || 'development'
  , pageTemplates = process.env.TLDR_PAGE_TEMPLATES
  , config;

switch(env) {
  case 'development':
    config = {
      env: 'development'
    , dbHost: 'localhost'
    , dbPort: 27017
    , dbName: 'dev-db'
    , svPort: 8787
    , apiUrl: 'http://localhost:8787'
    , origin: 'localhost:8888'   // The protocol is determined on a per request basis
    , websiteUrl: 'http://localhost:8888'
    , cookieMaxAge: 2*24*3600*1000
    , redisDb: 0
    , pageTemplates: pageTemplates
    , templatesDir: 'templates'
    , bcryptRounds: 6
    };
    break;

  case 'production':
    config = {
      env: 'production'
    , dbHost: 'localhost'
    , dbPort: 27017
    , dbName: 'prod-db'
    , svPort: 9001
    , apiUrl: 'http://api.tldr.io'
    , origin: 'tldr.io'   // The protocol is determined on a per request basis
    , websiteUrl: 'http://tldr.io'
    , cookieMaxAge: 365*24*3600*1000
    , cookieDomain: '.tldr.io'
    , redisDb:0
    , pageTemplates: pageTemplates
    , templatesDir: 'templates'
    , bcryptRounds: 6
    };
    break;

  case 'staging':
    config = {
      env: 'staging'
    , dbHost: 'localhost'
    , dbPort: 27017
    , dbName: 'prod-db'
    , svPort: 9002
    , apiUrl: 'http://api.tldr.io/staging'
    , origin: 'staging.tldr.io'   // The protocol is determined on a per request basis
    , websiteUrl: 'http://staging.tldr.io/'
    , cookieMaxAge: 365*24*3600*1000
    , cookieDomain: '.tldr.io'
    , redisDb:0
    , pageTemplates: pageTemplates
    , templatesDir: 'templates'
    , bcryptRounds: 6
    };
    break;

  case 'test':
    config = {
      env: 'test'
    , dbHost: 'localhost'
    , dbPort: 27017
    , dbName: 'test-db'
    , svPort: 8686
    , apiUrl: 'http://localhost:8787'
    , origin: 'http://localhost:8888'
    , websiteUrl: 'http://localhost:8888'
    , cookieMaxAge: 120*1000
    , redisDb: 9
    , pageTemplates: pageTemplates
    , templatesDir: 'templates'
    , bcryptRounds: 2
    };
    break;

  case 'testMail':
    config = {
      env: 'testMail'
    , dbHost: 'localhost'
    , dbPort: 27017
    , dbName: 'test-db'
    , svPort: 8686
    , apiUrl: 'http://localhost:8787'
    , origin: 'http://localhost:8888'
    , websiteUrl: 'http://localhost:8888'
    , cookieMaxAge: 120*1000
    , redisDb: 9
    , pageTemplates: pageTemplates
    , templatesDir: 'templates'
    , bcryptRounds: 2
    };
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
