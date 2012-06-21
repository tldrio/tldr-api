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
  , url = require('url')
  , bcrypt = require('bcrypt');



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
      var user = new UserModel({ name: 'A name'
                               , password: 'supersecret!'
                               })
        , valErr;

      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.login.should.equal('required');
        done();
      });
    });

    it('should not save a user that has no password', function (done) {
      var user = new UserModel({ login: 'login@email.com'
                               , name: 'A name'
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

    it('validate email address - login', function (done) {

      // Unit test the rule
      assert.isNull(UserModel.validateLogin('noarobase'));
      assert.isNull(UserModel.validateLogin('user@'));
      assert.isNull(UserModel.validateLogin('user@domain'));
      assert.isNull(UserModel.validateLogin('@domain.tld'));
      assert.isNotNull(UserModel.validateLogin('user@domain.tld'));
      assert.isNotNull(UserModel.validateLogin('firstname.name@subdomain.domain.tld'));

      // Test that it's well handled by Mongoose
      var userData = { password: 'supersecret!'
                     , name: 'A name'
                     , login: 'badlogin'
                     }
        , valErr, user;

      user = new UserModel(userData);
      user.save(function(err) {
        err.name.should.equal('ValidationError');
        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.login.should.equal('login must be a properly formatted email address');
        done();
      });
    });

    it('should lowercase login when saving a valid tldr', function (done) {
      var user = new UserModel({ login: 'lOGin@Email.com'
                               , name: 'A name'
                               , password: 'supersecret!'
                               })
        , valErr;

      user.save(function(err) {
        UserModel.find({login: 'login@email.com'}, function(err, docs) {
          docs.length.should.equal(1);

          UserModel.find({login: 'lOGin@Email.com'}, function(err, docs) {
            docs.length.should.equal(0);
            done();
          });
        });
      });
    });

    it('should not validate a name that\'s too long', function (done) {
      var user = new UserModel({ login: 'login@email.com'
                               , password: 'supersecret!'
                               , name: 'Zr qer qwer wqer qwer weqr wqe wqe wqr ew'
                               })
        , valErr;

      //Unit test the rule
      assert.isFalse(UserModel.validateName('Zr qer qwer wqer qwer weqr wqe wqe wqr ew'));

      // Check integration into Mongoose
      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.name.should.equal('name must have between 1 and 100 characters');
        done();
      });
    });

    it('should use a default value if the name is missing', function (done) {
      var user = new UserModel({ login: 'lOGin@Email.com'
                               , password: 'supersecret!'
                               })
        , valErr;

      user.save(function(err) {
        UserModel.find({login: 'login@email.com'}, function(err, docs) {
          docs.length.should.equal(1);
          docs[0].name.should.equal('Anonymous');

          done();
        });
      });
    });

    it('should not validate a user whose password is too short', function (done) {
      var user = new UserModel({ login: 'login@email.com'
                               , password: 'secre'
                               , name: 'wqr ew'
                               })
        , valErr;

      //Unit test the rule
      assert.isFalse(UserModel.validatePassword('secre'));

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
      var userData = { name: 'A name'
                     , password: 'short'
                     , login: 'valid@login.com'
                     }
        , valErr;

      UserModel.createAndSaveInstance(userData, function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.password.should.equal('password must be at least 6 characters long');
        done();
      });
    });

    it('should save a user whose password is valid', function (done) {
      var userData = { name: 'A name'
                     , password: 'notTOOshort'
                     , login: 'valid@login.com'
                     };

      UserModel.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);

        UserModel.find({login: 'valid@login.com'}, function(err, docs) {
          docs.should.have.length(1);

          // compareSync used here since these are tests. Do not use in production
          bcrypt.compareSync('notTOshort', docs[0].password).should.equal(false);
          bcrypt.compareSync('notTOOshort', docs[0].password).should.equal(true);
          bcrypt.compareSync('notTOOOshort', docs[0].password).should.equal(false);

          done();
        });
      });
    });

    it('should only save the authorized user fields', function (done) {
      var userData = { name: 'A name'
                     , password: 'notTOOshort'
                     , login: 'another@login.com'
                     , nonValidField: 'some value'
                     };
      // Try to save data with a non authorized field that will not be saved
      UserModel.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);
        UserModel.find({login: 'another@login.com'}, function(err, docs) {
          docs.should.have.length(1);
          assert.isUndefined(docs[0].nonValidField);

          done();
        });
      });
    });

  });


  describe('should not return the password field as part of the session usable data', function () {

    it('should save a user whose password is valid', function (done) {
      var userData = { name: 'A name'
                     , password: 'notTOOshort'
                     , login: 'valid@login.com'
                     }
        , sessionUsableFields;

      UserModel.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);

        UserModel.find({login: 'valid@login.com'}, function(err, docs) {
          docs.should.have.length(1);
          sessionUsableFields = docs[0].getSessionUsableFields();

          assert.isDefined(sessionUsableFields.name);
          assert.isDefined(sessionUsableFields.login);
          assert.isUndefined(sessionUsableFields.password);

          done();
        });
      });
    });



  });


});
