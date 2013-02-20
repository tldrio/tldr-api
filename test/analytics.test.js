/**
 * Testing that analytics aggregation behaves as expected
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , sinon = require('sinon')
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../lib/models')
  , User = models.User
  , Tldr = models.Tldr
  , Credentials = models.Credentials
  , Event = models.Event
  , TldrEvent = models.TldrEvent
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async')
  ;


// Version of setTimeout usable with async.apply
// Used to integration test parts using the message queue
function wait (millis, cb) {
  setTimeout(cb, millis);
}


/**
 * Tests
 */
describe.only('Analytics', function () {
  var user;

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    Credentials.remove({}, function(err) {
      User.remove({}, function(err) {
        Tldr.remove({}, function (err) {
          User.createAndSaveInstance({ username: "eeee", password: "eeeeeeee", email: "valid@email.com", twitterHandle: 'zetwit' }, function(err, _user) {
            user = _user;
            done();
          });
        });
      });
    });
  });

  describe('TldrEvent', function () {

    it('add an event to the daily collection', function (done) {
      done();
    });

  });   // ==== End of 'TldrEvent' ==== //

});
