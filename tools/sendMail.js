var _ = require('underscore')
  , h4e = require('h4e')
  , mailer = require('../lib/mailer')
  , values
  ;

h4e.setup({ extension: 'mustache'
          , baseDir: process.env.TLDR_API_DIR + '/templates'
          , toCompile: ['emails'] });

mailer.sendReadReport({ type: 'stats'
                 , development: true
                 , values: values
                 , to: 'hello+test@tldr.io'
                 }, function (err) {
                  process.exit(0);
                 });
