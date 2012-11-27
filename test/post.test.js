/**
 * Post tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../lib/models')
  , User = models.User
  , Post = models.Post
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async');


describe('Post', function () {
  var user;

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    User.remove({}, function (err) {
      Post.remove({}, function (err) {
        User.createAndSaveInstance({ username: "eeee", password: "eeeeeeee", email: "valid@email.com" }, function(err, _user) {
          user = _user;
          done();
        });
      });
    });
  });


  describe('createAndSaveInstance', function () {

    it('Shouldnt save a post with no text or a text with length 0 or more than 1000', function (done) {
      var postData = {}
        , valErr;

      Post.createAndSaveInstance(postData, null, function (err, post) {
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.text.should.equal(i18n.validatePostText);

        postData.text = "";
        Post.createAndSaveInstance(postData, null, function (err, post) {
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.text.should.equal(i18n.validatePostText);

          // Let's try with 1001 characters
          postData.text = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
          Post.createAndSaveInstance(postData, null, function (err, post) {
            valErr = models.getAllValidationErrorsWithExplanations(err.errors);
            valErr.text.should.equal(i18n.validatePostText);

            done();
          });
        });
      });
    });

    it('Should give a validation error if we try to create a post with no creator', function (done) {
      var postData = { text: "youpla" }
        , valErr;

      Post.createAndSaveInstance(postData, null, function (err, post) {
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.creator.should.equal('required');
        _.keys(valErr).length.should.equal(1);

        Post.createAndSaveInstance(postData, undefined, function (err, post) {
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.creator.should.equal('required');
          _.keys(valErr).length.should.equal(1);

          done();
        });
      });
    });

    it('Should save a post that satisfies validation', function (done) {
      var postData = { text: "youpla"
                     , unusedField: "test"
                     };

      Post.createAndSaveInstance(postData, user, function (err, post) {
        assert.isNull(err);
        post.text.should.equal("youpla");
        post.creator.toString().should.equal(user._id.toString());
        assert.isUndefined(post.unusedField);
        done();
      });
    });


  });   // ==== End of 'createAndSaveInstance' ==== //


  describe.only('#changeText', function () {
    it('Should not change text if newText doesnt pass validation', function (done) {
      var postData = { text: "youpla"
                     }
        , smallText = ''
        , bigText = 'qqwqqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopwertyuiopqqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopwertyuiopqqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopwertyuiopqqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopwertyuiopqqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopwertyuiopqqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopwertyuiopqqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopwertyuiopqqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopwertyuiopqqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopwertyuiopertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopqwertyuiopwertyuiopZ'
        ;

      Post.createAndSaveInstance(postData, user, function (err, post) {
        assert.isNull(err);
        post.text.should.equal("youpla");

        post.changeText(smallText, function (err) {
          assert.isDefined(models.getAllValidationErrorsWithExplanations(err.errors).text);
          Post.findOne({ _id: post._id }, function (err, _p) {
            _p.text.should.equal('youpla');

            post.changeText(bigText, function (err) {
              assert.isDefined(models.getAllValidationErrorsWithExplanations(err.errors).text);
              done();
            });
          });
        });
      });
    });
  });   // ==== End of '#changeText' ==== //


  describe('XSS prevention', function () {

    it('posts should be protected at creation against XSS', function (done) {
      var postData = { text: "youpdocument.writela"
                     };

      Post.createAndSaveInstance(postData, user, function (err, post) {
        post.text.should.equal("youpla");
        done();
      });
    });
  
  
  });



});

