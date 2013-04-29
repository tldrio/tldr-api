#! /usr/local/bin/node

var _ = require('underscore')
  , h4e = require('h4e')
  , bunyan = require('../lib/logger').bunyan
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , i18n = require('../lib/i18n')
  , models = require('../lib/models')
  , mailer = require('../lib/mailer')
  , User = models.User
  , async = require('async')
  , limitDateOfInactivity
  ;

h4e.setup({ extension: 'mustache'
          , baseDir: process.env.TLDR_API_DIR + '/templates'
          , toCompile: ['emails'] });


function checkForInactivity (limitDateOfInactivity) {
  User.find({})
  .where('lastActive').lte(limitDateOfInactivity)
  .where('lastActiveMailSent').equals(false)
   .exec(function(err, users) {
     if (err) {
       console.log('Fatal error, couldnt retrieve the docs');
       process.exit(1);
     }
     if (!user.email) {
       return;
     }

    async.each( users
              , function (user, cb) {
        mailer.sendEmail({ type: 'inactivity'
                        , development: true
                        , from: 'Charles Miglietti <charles@tldr.io>'
                        , values: user
                        , to: config.env === 'development' ? 'hello+test@tldr.io' : user.email
                        }, function (err) {
                          bunyan.info('Inactivity email sent to ' + user.email);
                          user.lastActiveMailSent = true;
                          user.save(function() {
                            cb(err);
                          });
                        });
              }
              , function (err) {
      if (err) {
        bunyan.error('Error while sending Inactivity emails', err);
        process.exit(1);
      } else {
        bunyan.info(users.length + ' Inactivity emails sent');
        process.exit(0);
      }
    });
  });
}

db.connectToDatabase(function() {
  limitDateOfInactivity = new Date();
  limitDateOfInactivity.setDate( limitDateOfInactivity.getDate() - 17 );
  checkForInactivity(limitDateOfInactivity);
});

