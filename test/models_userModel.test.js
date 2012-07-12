/**
 * User tests
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
  , User = models.User
  , server = require('../server')
  , db = server.db
  , url = require('url')
  , bcrypt = require('bcrypt');



/**
 * Tests
 */


describe('User', function () {

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    User.remove( function (err) {
      if (err) {throw done(err);}
      done();
    });
  });


  describe('#validators', function () {

    it('should not save a user that has no email', function (done) {
      var user = new User({ username: 'A name'
                               , password: 'supersecret!'
                               })
        , valErr;

      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.email.should.equal('required');
        done();
      });
    });

    it('should not save a user that has no password', function (done) {
      var user = new User({ email: 'email@email.com'
                               , username: 'A name'
                               })
        , valErr;

      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.password.should.equal('required');
        done();
      });
    });

    it('should not save a user that has no username', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'Axcxxname'
                               })
        , valErr;

      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.username.should.equal('required');
        done();
      });
    });

    it('validate email address - email', function (done) {

      // Unit test the rule
      assert.isNull(User.validateLogin('noarobase'));
      assert.isNull(User.validateLogin('user@'));
      assert.isNull(User.validateLogin('user@domain'));
      assert.isNull(User.validateLogin('@domain.tld'));
      assert.isNotNull(User.validateLogin('user@domain.tld'));
      assert.isNotNull(User.validateLogin('firstname.name@subdomain.domain.tld'));

      // Test that it's well handled by Mongoose
      var userData = { password: 'supersecret!'
                     , username: 'A name'
                     , email: 'bademail'
                     }
        , valErr, user;

      user = new User(userData);
      user.save(function(err) {
        err.name.should.equal('ValidationError');
        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.email.should.equal('email must be a properly formatted email address');
        done();
      });
    });

    it('should not validate a name that\'s too long', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Zr qer qwer wqer qwer weqr wqe wqe wqr ew'
                               })
        , valErr;

      //Unit test the rule
      assert.isFalse(User.validateName('Zr qer qwer wqer qwer weqr wqe wqe wqr ew'));

      // Check integration into Mongoose
      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.username.should.equal('username must have between 1 and 100 characters');
        done();
      });
    });

    it('should not validate a user whose password is too short', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'secre'
                               , username: 'wqr ew'
                               })
        , valErr;

      //Unit test the rule
      assert.isFalse(User.validatePassword('secre'));

      // Check integration into Mongoose
      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.password.should.equal('password must be at least 6 characters long');
        done();
      });
    });
  });



  describe('#createAndSaveInstance', function () {

    it('should not be able to save a user whose password is not valid', function (done) {
      var userData = { username: 'A name'
                     , password: 'short'
                     , email: 'valid@email.com'
                     }
        , valErr;

      User.createAndSaveInstance(userData, function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.password.should.equal('password must be at least 6 characters long');
        done();
      });
    });

    it('lowercase the email and use it as the default value for the username', function (done) {
      var userData = { password: 'notTOOshort'
                     , email: 'vaLId@email.com'
                     };

      User.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);

        User.find({email: 'valid@email.com'}, function(err, docs) {
          docs.should.have.length(1);
          docs[0].username.should.equal("valid@email.com");

          done();
        });
      });
    });

    it('should save a user whose password is valid', function (done) {
      var userData = { username: 'A name'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     };

      User.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);

        User.find({email: 'valid@email.com'}, function(err, docs) {
          docs.should.have.length(1);

          // compareSync used here since these are tests. Do not use in production
          bcrypt.compareSync('notTOshort', docs[0].password).should.equal(false);
          bcrypt.compareSync('notTOOshort', docs[0].password).should.equal(true);
          bcrypt.compareSync('notTOOOshort', docs[0].password).should.equal(false);

          docs[0].username.should.equal("A name");

          done();
        });
      });
    });

    it('should not save a user with the same email twice', function (done) {
      var userData = { username: 'A name'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     };

      User.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);
        userData.password = "bloupbloup";
        userData.username = "a username";

        User.createAndSaveInstance(userData, function(err) {
          err.code.should.equal(11000);   // Duplicate key
          done();
        });
      });
    });

    it('should only save the authorized user fields', function (done) {
      var userData = { username: 'A name'
                     , password: 'notTOOshort'
                     , email: 'another@email.com'
                     , nonValidField: 'some value'
                     };
      // Try to save data with a non authorized field that will not be saved
      User.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);
        User.find({email: 'another@email.com'}, function(err, docs) {
          docs.should.have.length(1);
          assert.isUndefined(docs[0].nonValidField);

          done();
        });
      });
    });
  });


  describe('should not return the password field as part of the session usable data', function () {

    it('should save a user whose password is valid', function (done) {
      var userData = { username: 'A name'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     }
        , sessionUsableFields;

      User.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);

        User.find({email: 'valid@email.com'}, function(err, docs) {
          docs.should.have.length(1);
          sessionUsableFields = docs[0].getAuthorizedFields();

          assert.isDefined(sessionUsableFields.username);
          assert.isDefined(sessionUsableFields.email);
          assert.isUndefined(sessionUsableFields.password);
          assert.isUndefined(sessionUsableFields._id);

          done();
        });
      });
    });



  });


});
