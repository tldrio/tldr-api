/**
 * Tldr tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , app = require('../server')
  , i18n = require('../lib/i18n')
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , User = models.User
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , request = require('request')
  , rootUrl = 'http://localhost:8686'
  , async = require('async')
  , mailer = require('../lib/mailer');





/**
 * Tests
 */

if (config.env === 'testMail') {

  describe('Mails', function () {
    var user
      , tldr
      , tldrData = {url: 'http://needforair.com/nutcrackers', title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()};

  before(function (done) {
    app.launchServer(done);
  });

  after(function (done) {
    app.stopServer(done);
  });

    beforeEach(function (done) {
      User.remove({}, function(err) {
        Tldr.remove({}, function (err) {
          User.createAndSaveInstance({ username: "TLDR", password: "password", email: "hello@tldr.io" }, function(err, _user) {
            user = _user;
            Tldr.createAndSaveInstance(tldrData, user, function(err, _tldr) {
              tldr = _tldr;
              done();
            });
          });
        });
      });
    });

    describe('should be sent correctly', function () {
      it('when user signs up welcome him', function (done) {

        mailer.sendEmail({ type: 'welcome'
                         , to: 'hello+test@tldr.io'
                         , values: { email: encodeURIComponent(user.email), token: encodeURIComponent(user.confirmEmailToken), user: user }
                         }, function() { done();} );

      });

      it('when user signs up confirm his email address', function (done) {

        mailer.sendEmail({ type: 'emailConfirmationToken'
                         , to: 'hello+test@tldr.io'
                         , values: { email: encodeURIComponent(user.email), token: encodeURIComponent(user.confirmEmailToken), user: user }
                         }, function() { done();} );

      });

      it('when user creates its first tldr', function (done) {

          mailer.sendEmail({ type: 'congratulationsFirstTldr'
                         , to: 'hello+test@tldr.io'
                           , development: true
                           , values: {}
                           }, function() { done();} );

      });

      it('when user has reseted his password', function (done) {

        mailer.sendEmail({ type: 'passwordWasReset'
                         , to: 'hello+test@tldr.io'
                         , values: { user: user }
                        }, function() { done();} );

      });

      it('when user want to reset its passwrod', function (done) {

        mailer.sendEmail({ type: 'resetPassword'
                         , to: 'hello+test@tldr.io'
                         , values: { user: user, email: encodeURIComponent(user.email), token: encodeURIComponent(user.resetPasswordToken) }
                        }, function() { done();} );

      });

    });

  });
}

