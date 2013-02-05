/**
 * User tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , sinon = require('sinon')
  , mongoose = require('mongoose') // ODM for Mongo
  , ObjectId = mongoose.Schema.ObjectId
  , models = require('../lib/models')
  , Credentials = models.Credentials
  , notificator = require('../lib/notificator')
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , url = require('url')
  , bcrypt = require('bcrypt')
  , async = require('async')
  ;



/**
 * Tests
 */


describe('Credentials', function () {

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    function theRemove(collection, cb) { collection.remove({}, function(err) { cb(err); }); }   // Remove everything from collection
    async.waterfall([
      async.apply(theRemove, Credentials)
    ], done);
  });

  describe('Basic credentials', function () {

    it('The password needs to be at least 6 characters', function (done) {
      var bcData = { login: 'bloups@email.com', password: 'abcdh' };
      Credentials.createBasicCredentials(bcData, function (err, bc) {
        var valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        _.keys(valErr).length.should.equal(1);
        valErr.password.should.equal(i18n.validateUserPwd);
        done();
      });
    });

    it('If the constraints are respected, the password should be crypted', function (done) {
      var bcData = { login: 'bloups@email.com', password: 'longenough' };
      Credentials.createBasicCredentials(bcData, function (err, bc) {
        bc.password.should.not.equal(bcData.password);
        bc.type.should.equal('basic');
        bc.login.should.equal(bcData.login);
        bcrypt.compareSync('logenough', bc.password).should.equal(false);
        bcrypt.compareSync('longenough', bc.password).should.equal(true);
        bcrypt.compareSync('loongenough', bc.password).should.equal(false);
        done();
      });
    });

    it('Dont change the password if user supplies a wrong or no current password', function (done) {
      var bcData = { login: 'bloups@email.com', password: 'longenough' };
      Credentials.createBasicCredentials(bcData, function (err, bc) {
        bc.updatePassword(undefined, 'newpwdyeah', function(err) {
          err.oldPassword.should.equal(i18n.oldPwdMismatch);

          bc.updatePassword('abadpassword', 'newpwdyeah', function(err) {
            err.oldPassword.should.equal(i18n.oldPwdMismatch);
            done();
          });
        });
      });
    });

    it('Dont change the password if new password is not valid', function (done) {
      var bcData = { login: 'bloups@email.com', password: 'longenough' };
      Credentials.createBasicCredentials(bcData, function (err, bc) {
        bc.updatePassword('longenough', 'small', function(err) {
          err.newPassword.should.equal(i18n.validateUserPwd);
          done();
        });
      });
    });

    it('Can change the password if the parameters are correct', function (done) {
      var bcData = { login: 'bloups@email.com', password: 'longenough' };
      Credentials.createBasicCredentials(bcData, function (err, bc) {
        bc.updatePassword('longenough', 'coolnewpwd', function(err, bc) {
          assert.isNull(err);
          bcrypt.compareSync('coolnewpwd', bc.password).should.equal(true);
          done();
        });
      });
    });


  });

});

