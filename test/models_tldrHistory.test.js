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


describe('TldrHistory', function () {

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

      // Create a user according to userData
      function createUser (userData, cb) { User.createAndSaveInstance(userData, function(err, user) { return cb(err, user); }); }

      // Save a version in the history
      function saveVersion (data, user, cb) { history.saveVersion(data, user, function(err) { cb(err); }) }

      async.parallel({
        // Create user1 and user2
        user1: async.apply(createUser, userData1)
      , user2: async.apply(createUser, userData2)
      }, function(err, results) {
           async.waterfall([
             function(cb) { history.versions.length.should.equal(0); cb(); }

             // Create the first two versions
           , async.apply(saveVersion, 'first blob', results.user1)
           , async.apply(saveVersion, 'second blob', results.user2)

             // Test that the first two versions were saved as expected
           , function(cb) {
                history.versions[0].creator.should.equal(results.user2._id);
                history.versions[0].data.should.equal('second blob');

                history.versions[1].creator.should.equal(results.user1._id);
                history.versions[1].data.should.equal('first blob');

                cb();
             }

             // Create another two versions
           , async.apply(saveVersion, 'third blob', results.user2)
           , async.apply(saveVersion, 'fourth blob', results.user1)

             // And test its still as expected
           , function (cb) {
               history.versions[0].data.should.equal('fourth blob');
               history.versions[0].creator.should.equal(results.user1._id);

               history.versions[1].data.should.equal('third blob');
               history.versions[1].creator.should.equal(results.user2._id);

               history.versions[2].data.should.equal('second blob');
               history.versions[2].creator.should.equal(results.user2._id);

               history.versions[3].data.should.equal('first blob');
               history.versions[3].creator.should.equal(results.user1._id);

               cb();
             }
           ], done);
         });

    });


  });
});
