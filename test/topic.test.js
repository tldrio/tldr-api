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


describe('Topic', function () {
  var user, userbis;

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

            User.createAndSaveInstance({ username: "ffff", password: "eeeeeeee", email: "validanother@email.com" }, function(err, _user) {
              userbis = _user;

              done();
            });
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
        topic.votes.should.equal(1);
        topic.alreadyVoted.length.should.equal(1);
        topic.alreadyVoted[0].toString().should.equal(user._id.toString());
        assert.isUndefined(topic.unusedField);

        done();
      });
    });

    it('Should have a virtual slug attribute out of the topics title', function (done) {
      var topicData = { title: "youpla boum tzing"
                     };

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        assert.isNull(err);
        topic.slug.should.equal("youpla-boum-tzing");

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

    it('Should add a new post creator to the list of participants', function (done) {
      var topicData = { title: "A title" }
        , postData1 = { text: "first post yeaaah" }
        ;

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        topic.addPost(postData1, userbis, function (err, post) {
          Topic.findOne({ _id: topic._id })
          .exec(function (err, topic) {
            topic.participants.length.should.equal(1);
            topic.participants[0].toString().should.equal(userbis._id.toString());

            done();
          });
        });
      });
    });

    it('Should update lastPost.at iif someone posts succesfully to a topic', function (done) {
      var topicData = { title: "A title" }
        , postData1 = { text: "first post yeaaah" }
        , postData2 = { text: "oh noes im only second" }
        , date0, date1, date2, date3;

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        date0 = topic.lastPost.at;
        topic.addPost(postData1, user, function (err, post) {
          date1 = topic.lastPost.at;
          topic.addPost(postData2, user, function (err, post) {
            date2 = topic.lastPost.at;
            assert.isTrue(date1 - date0 > 0);
            assert.isTrue(date2 - date1 > 0);

            topic.addPost({}, user, function (err, post) {
              date3 = topic.lastPost.at;
              date3.should.equal(date2);

              done();
            });
          });
        });
      });
    });

    it('Should update lastPost.by iif someone posts succesfully to a topic', function (done) {
      var topicData = { title: "A title" }
        , postData1 = { text: "first post yeaaah" }
        , postData2 = { text: "oh noes im only second" };

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        topic.addPost(postData1, user, function (err, post) {
          topic.lastPost.by.toString().should.equal(user._id.toString());
          topic.addPost(postData2, userbis, function (err, post) {
            topic.lastPost.by.toString().should.equal(userbis._id.toString());
            topic.addPost({}, user, function (err, post) {
              assert.isDefined(err);
              topic.lastPost.by.toString().should.equal(userbis._id.toString());

              done();
            });
          });
        });
      });
    });

  });   // ==== End of '#addPost' ==== //


  describe('#createTopicAndFirstPost', function () {

    it('Should not be able to create a topic with first post if there are validation errors', function (done) {
      var topicData = { title: "Onnnnne title" }
        , postData = { text: "And aaaa text" }
        , valErr;

      // Test with a null user
      Topic.createTopicAndFirstPost(topicData, postData, null, function (err) {
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        _.keys(valErr).length.should.equal(1);
        assert.isDefined(valErr.creator);

        // Test with no post data
        Topic.createTopicAndFirstPost(topicData, {}, user, function (err) {
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          _.keys(valErr).length.should.equal(1);
          assert.isDefined(valErr.text);

          // Test with no topic data
          Topic.createTopicAndFirstPost({}, postData, user, function (err) {
            valErr = models.getAllValidationErrorsWithExplanations(err.errors);
            _.keys(valErr).length.should.equal(1);
            assert.isDefined(valErr.title);

            // Test with no data at all!
            Topic.createTopicAndFirstPost({}, {}, undefined, function (err) {
              valErr = models.getAllValidationErrorsWithExplanations(err.errors);
              _.keys(valErr).length.should.equal(3);
              assert.isDefined(valErr.title);
              assert.isDefined(valErr.text);
              assert.isDefined(valErr.creator);

              done();
            });
          });
        });
      });

    });

    it('Should able to create a topic with first post if everything is OK and add the creator to the participants', function (done) {
      var topicData = { title: "Onnnnne title" }
        , postData = { text: "And aaaa text" }
        , valErr;

      Topic.createTopicAndFirstPost(topicData, postData, user, function (err, topic) {
        assert.isNull(err);
        topic.title.should.equal("Onnnnne title");
        topic.posts.length.should.equal(1);
        topic.creator.toString().should.equal(user._id.toString());
        topic.participants.length.should.equal(1);
        topic.participants[0].toString().should.equal(user._id.toString());

        Post.findOne({ _id: topic.posts[0] }, function (err, post) {
          post.text.should.equal("And aaaa text");
          post.creator.toString().should.equal(user._id.toString());

          done();
        });
      });

    });

  });   // ==== End of '#createTopicAndFirstPost' ==== //


  describe('#vote', function () {

    it('Should not be able to vote with no voter', function (done) {
      var topicData = { title: "youpla"
                     , unusedField: "test"
                     };

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        assert.isNull(err);
        topic.votes.should.equal(1);
        topic.alreadyVoted.length.should.equal(1);

        topic.vote(1, null, function (err, topic) {
          assert.isDefined(err.voter);

          done();
        });
      });
    });

    it('Should be able to vote but only once', function (done) {
      var topicData = { title: "youpla"
                     , unusedField: "test"
                     };

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        assert.isNull(err);
        topic.votes.should.equal(1);
        topic.alreadyVoted.length.should.equal(1);

        topic.vote(1, userbis, function (err, topic) {
          assert.isNull(err);
          topic.votes.should.equal(2);
          topic.alreadyVoted.indexOf(user._id).should.not.equal(-1);

          topic.vote(1, userbis, function (err, topic) {
            assert.isNull(err);
            topic.votes.should.equal(2);
            topic.alreadyVoted.indexOf(user._id).should.not.equal(-1);

            done();
          });
        });
      });
    });

    it('Should be able to downvote too', function (done) {
      var topicData = { title: "youpla"
                     , unusedField: "test"
                     };

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        assert.isNull(err);
        topic.votes.should.equal(1);
        topic.alreadyVoted.length.should.equal(1);

        topic.vote(-1, userbis, function (err, topic) {
          assert.isNull(err);
          topic.votes.should.equal(0);
          topic.alreadyVoted.indexOf(userbis._id).should.not.equal(-1);

          done();
        });
      });
    });

    it('By default, the vote is an upvote (string version)', function (done) {
      var topicData = { title: "youpla"
                     , unusedField: "test"
                     };

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        assert.isNull(err);
        topic.votes.should.equal(1);
        topic.alreadyVoted.length.should.equal(1);

        // A string instead of a number
        topic.vote("bloup", userbis, function (err, topic) {
          assert.isNull(err);
          topic.votes.should.equal(2);
          topic.alreadyVoted.indexOf(userbis._id).should.not.equal(-1);

          done();
        });
      });
    });

    it('By default, the vote is an upvote (undefined version)', function (done) {
      var topicData = { title: "youpla"
                     , unusedField: "test"
                     };

      Topic.createAndSaveInstance(topicData, user, function (err, topic) {
        assert.isNull(err);
        topic.votes.should.equal(1);
        topic.alreadyVoted.length.should.equal(1);

        // undefined instead of a number
        topic.vote(undefined, userbis, function (err, topic) {
          assert.isNull(err);
          topic.votes.should.equal(2);
          topic.alreadyVoted.indexOf(userbis._id).should.not.equal(-1);

          done();
        });
      });
    });


  });   // ==== End of '#vote' ==== //


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
