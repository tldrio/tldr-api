/**
 * Topic tests
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
  , Topic = models.Topic
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async');


describe.only('Topic', function () {
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
        Topic.remove({}, function (err) {
          User.createAndSaveInstance({ username: "eeee", password: "eeeeeeee", email: "valid@email.com" }, function(err, _user) {
            user = _user;
            done();
          });
        });
      });
    });
  });


  describe('createAndSaveInstance', function () {

    it('Shouldnt save a topic with no title or a title with length 0 or more than 100', function (done) {
      var topicData = {}
        , valErr;

      Topic.createAndSaveInstance(topicData, null, function (err, topic) {
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.title.should.equal(i18n.validateTopicTitle);

        topicData.title = "";
        Topic.createAndSaveInstance(topicData, null, function (err, topic) {
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.title.should.equal(i18n.validateTopicTitle);

          // Let's try with 101 characters
          topicData.title = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
          Topic.createAndSaveInstance(topicData, null, function (err, topic) {
            valErr = models.getAllValidationErrorsWithExplanations(err.errors);
            valErr.title.should.equal(i18n.validateTopicTitle);

            done();
          });
        });
      });
    });

    it('Should give a validation error if we try to create a topic with no creator', function (done) {
      var topicData = { title: "youpla" }
        , valErr;

      Topic.createAndSaveInstance(topicData, null, function (err, topic) {
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.creator.should.equal('required');
        _.keys(valErr).length.should.equal(1);

        Topic.createAndSaveInstance(topicData, undefined, function (err, topic) {
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.creator.should.equal('required');
          _.keys(valErr).length.should.equal(1);

          done();
        });
      });
    });

    it('Should save a topic that satisfies validation and initialize the posts array', function (done) {
      var topicData = { title: "youpla"
                     , unusedField: "test"
                     };

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        assert.isNull(err);
        topic.title.should.equal("youpla");
        topic.creator.toString().should.equal(user._id.toString());
        topic.posts.length.should.equal(0);
        assert.isUndefined(topic.unusedField);

        done();
      });
    });


  });   // ==== End of 'createAndSaveInstance' ==== //


  describe('#addPost', function () {

    it('Should not add a new post if it doesnt pass validation', function (done) {
      var topicData = { title: "A title" }
        , postData = { text: "" }
        , valErr
        ;

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        topic.addPost(postData, user, function (err, post) {
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.text.should.equal(i18n.validatePostText);
          _.keys(valErr).length.should.equal(1);

          Topic.findOne({ _id: topic._id}, function (err, topic) {
            topic.posts.length.should.equal(0);
            done();
          });
        });
      });
    });

    it('Should add new posts to a topic if it passes validation. New posts are added at the end of the topic', function (done) {
      var topicData = { title: "A title" }
        , postData1 = { text: "first post yeaaah" }
        , postData2 = { text: "oh noes im only second" }
        ;

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        topic.addPost(postData1, user, function (err, post) {
          topic.addPost(postData2, user, function (err, post) {
            Topic.findOne({ _id: topic._id })
            .populate('posts')
            .exec(function (err, topic) {
              topic.posts.length.should.equal(2);
              topic.posts[0].text.should.equal('first post yeaaah');
              topic.posts[1].text.should.equal('oh noes im only second');

              done();
            });
          });
        });
      });
    });

  });   // ==== End of '#addPost' ==== //



  describe('XSS prevention', function () {

    it('topics should be protected at creation against XSS', function (done) {
      var topicData = { title: "youpdocument.writela"
                     };

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        topic.title.should.equal("youpla");
        done();
      });
    });
  
  
  });   // ==== End of 'XSS prevention' ==== //



});


