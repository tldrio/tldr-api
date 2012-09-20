/**
 * Tldr History tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , models = require('../lib/models')
  , User = models.User
  , TldrHistory = models.TldrHistory
  , server = require('../server')
  , db = server.db
  , async = require('async');





/**
 * Tests
 */


describe.only('TldrHistory', function () {

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    function theRemove(collection, cb) { collection.remove({}, function(err) { cb(err); }) }   // Remove everything from collection

    async.waterfall([
      async.apply(theRemove, User)
    , async.apply(theRemove, TldrHistory)
    ], done);
  });


  describe('Basic behaviour', function () {

    it('Should create an history thats only the empty versions array', function (done) {
      var history = new TldrHistory();
      history.versions.length.should.equal(0);
      done();
    });

    it('Should create new versions with method saveVersion and save them in the latest to oldest order and with the right creator', function (done) {
      var history = new TldrHistory()
        , userData1 = { username: 'NFADeploy'
                     , password: 'goodpassword'
                     , email: 'valid@email.com'
                     }
        , userData2 = { username: 'NFADDDDeploy'
                     , password: 'goodpassword'
                     , email: 'anothervalid@email.com'
                     };

      User.createAndSaveInstance(userData1, function(err, user1) {
        User.createAndSaveInstance(userData2, function(err, user2) {
          history.versions.length.should.equal(0);

          history.saveVersion('first blob', user1, function() {
            history.saveVersion('second blob', null, function(err) {
              history.versions[0].data.should.equal('second blob');
              assert.isUndefined(history.versions[0].creator);

              history.versions[1].creator.should.equal(user1._id);
              history.versions[1].data.should.equal('first blob');

              history.saveVersion('third blob', user2, function() {
                history.saveVersion('fourth blob', undefined, function() {
                  history.versions[0].data.should.equal('fourth blob');
                  assert.isUndefined(history.versions[0].creator);

                  history.versions[1].data.should.equal('third blob');
                  history.versions[1].creator.should.equal(user2._id);

                  history.versions[2].data.should.equal('second blob');
                  assert.isUndefined(history.versions[2].creator);

                  history.versions[3].creator.should.equal(user1._id);
                  history.versions[3].data.should.equal('first blob');

                  done();
                });
              });
            });
          });
        });
      });
    });


  });
});
