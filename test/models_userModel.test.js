/**
 * UserModel tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , sinon = require('sinon')
  , bunyan = require('../lib/logger').bunyan // Audit logger 
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../models')
  , UserModel = models.UserModel
  , server = require('../server')
  , db = server.db
  , url = require('url');



/**
 * Tests
 */


describe('UserModel', function () {

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    UserModel.remove( function (err) {
      if (err) {throw done(err);}
      done();
    });
  });


  describe('#validators', function () {

    it('should not save a user that has no login', function (done) {
      var user = new UserModel({ name: "A name"
                               , password: "supersecret!"
                               })
        , valErr;

      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.login.should.not.equal(null);
        done();
      });
    });

    it('should not save a user that has no password', function (done) {
      var user = new UserModel({ login: "login@email.com"
                               , name: "A name"
                               })
        , valErr;

      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.password.should.not.equal(null);
        done();
      });
    });

    it('should only save a user if his login is a valid email address', function (done) {
      var userData = { password: "supersecret!"
                               , name: "A name"
                               }
        , valErr, user;

      // Test 1: no arobase
      userData.login = "noarobase";
      user = new UserModel(userData);
      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.login.should.not.equal(null);

        // Test 2: no domain
        userData.login = "user@";
        user = new UserModel(userData);
        user.save(function(err) {
          err.name.should.equal('ValidationError');

          _.keys(err.errors).length.should.equal(1);
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.login.should.not.equal(null);

          // Test 3: incomplete domain
          userData.login = "user@domain";
          user = new UserModel(userData);
          user.save(function(err) {
            err.name.should.equal('ValidationError');

            _.keys(err.errors).length.should.equal(1);
            valErr = models.getAllValidationErrorsWithExplanations(err.errors);
            valErr.login.should.not.equal(null);

            // Test 4: no user
            userData.login = "@domain.tld";
            user = new UserModel(userData);
            user.save(function(err) {
              err.name.should.equal('ValidationError');

              _.keys(err.errors).length.should.equal(1);
              valErr = models.getAllValidationErrorsWithExplanations(err.errors);
              valErr.login.should.not.equal(null);

              // Test 5: correct email #1
              userData.login = "user@domain.tld";
              user = new UserModel(userData);
              user.save(function(err) {
                assert.isNull(err);

                // Test 6: correct email #2
                userData.login = "firstname.name@subdomain.domain.tld";
                user = new UserModel(userData);
                user.save(function(err) {
                  assert.isNull(err);

                  done()
                });
              });
            });
          });
        });
      });
    });

    it('should lowercase login when saving a valid tldr', function (done) {
      var user = new UserModel({ login: "lOGin@Email.com"
                               , name: "A name"
                               , password: "supersecret!"
                               })
        , valErr;

      user.save(function(err) {
        UserModel.find({login: "login@email.com"}, function(err, docs) {
          docs.length.should.equal(1);

          UserModel.find({login: "lOGin@Email.com"}, function(err, docs) {
            docs.length.should.equal(0);
            done();
          });
        });
      });
    });

    it('should not validate a name that\'s too long', function (done) {
      var user = new UserModel({ login: "login@email.com"
                               , password: "supersecret!"
                               , name: "Zr qer qwer wqer qwer weqr wqe wqe wqr ew"
                               })
        , valErr;

      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.name.should.not.equal(null);
        done();
      });
    });

    it('should use a default value if the name is missing', function (done) {
      var user = new UserModel({ login: "lOGin@Email.com"
                               , password: "supersecret!"
                               })
        , valErr;

      user.save(function(err) {
        UserModel.find({login: "login@email.com"}, function(err, docs) {
          docs.length.should.equal(1);
          docs[0].name.should.equal("");

          done();
        });
      });
    });

    it('should not validate a user whose password is too short', function (done) {
      var user = new UserModel({ login: "login@email.com"
                               , password: "secre"
                               , name: "wqr ew"
                               })
        , valErr;

      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.password.should.not.equal(null);
        done();
      });
    });
  });



  describe('#createAndSaveInstance', function () {

    it('should not be able to save a user whose password is not valid', function (done) {
      var userData = { name: "A name"
                               , password: "short"
                               , login: "valid@login.com"
                     }
        , valErr;

      UserModel.createAndSaveInstance(userData, function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.password.should.not.equal(null);
        done();
      });
    });


  });



});
