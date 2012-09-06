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
    , origin: 'http://localhost:8888'
    , websiteUrl: 'http://localhost:8888/dist/website/local'
    , cookieMaxAge: 2*24*3600*1000
    , redisDb: 0
    , pageTemplates: pageTemplates
    , bcryptRounds: 6
    , locals: { pageScript:'data-main="http://localhost:8888/dist/page/local/src/page.js" src="http://localhost:8888/src/vendor/require/require.js"'
                             , baseCss: 'http://localhost:8888/dist/page/local/assets/css' } // This replaces the `view options` in express 3.x
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
    , origin: 'http://tldr.io'
    , websiteUrl: 'http://tldr.io'
    , cookieMaxAge: 7*24*3600*1000
    , redisDb:0
    , pageTemplates: pageTemplates
    , bcryptRounds: 6
    , locals: { pageScript:'src="http://tldr.io/page/src/page.js"'
              , baseCss: 'http://tldr.io/page/assets/css' } // This replaces the `view options` in express 3.x

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
    , origin: 'http://localhost:8888'
    , websiteUrl: 'http://tldr.io/staging'
    , cookieMaxAge: 7*24*3600*1000
    , redisDb:0
    , pageTemplates: pageTemplates
    , bcryptRounds: 6
    , locals: { pageScript:'src="http://tldr.io/page/staging/src/page.js"'
              , baseCss: 'http://tldr.io/page/staging/assets/css' } // This replaces the `view options` in express 3.x

    };
    break;

  case 'test':
    config = {
      env: 'test'
    , dbHost: 'localhost'
    , dbPort: 27017
    , dbName: 'test-db'
    , svPort: 8787
    , apiUrl: 'http://localhost:8787'
    , origin: 'http://localhost:8888'
    , websiteUrl: 'http://localhost:8888/dist/website/local'
    , cookieMaxAge: 120*1000
    , redisDb: 9
    , pageTemplates: pageTemplates
    , bcryptRounds: 2
    , locals:  { pageScript:'data-main="http://localhost:8888/dist/page/local/src/page.js" src="http://localhost:8888/src/vendor/require/require.js"'
               , baseCss: 'http://localhost:8888/dist/page/local/assets/css' } // This replaces the `view options` in express 3.x
    };
    break;

}

config.session = { secret: 'this is da secret, dawg'    // Used for cookie encryption
                           , key: 'tldr_session'                  // Name of our cookie
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


module.exports = config;
