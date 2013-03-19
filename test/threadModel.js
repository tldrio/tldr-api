/**
 * Thread tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../lib/models')
  , Credentials = models.Credentials
  , User = models.User
  , Post = models.Post
  , Thread = models.Thread
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async');


describe('Thread', function () {
  var user, userbis;

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    Credentials.remove({}, function (err) {
      User.remove({}, function (err) {
        Post.remove({}, function (err) {
          Thread.remove({}, function (err) {
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
  });


  describe('createAndSaveInstance', function () {

    it('Shouldnt save a thread with no title or a title with length 0 or more than 100', function (done) {
      var threadData = {}
        , valErr;

      Thread.createAndSaveInstance(threadData, null, function (err, thread) {
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.title.should.equal(i18n.validateThreadTitle);

        threadData.title = "";
        Thread.createAndSaveInstance(threadData, null, function (err, thread) {
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.title.should.equal(i18n.validateThreadTitle);

          // Let's try with 101 characters
          threadData.title = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
          Thread.createAndSaveInstance(threadData, null, function (err, thread) {
            valErr = models.getAllValidationErrorsWithExplanations(err.errors);
            valErr.title.should.equal(i18n.validateThreadTitle);

            done();
          });
        });
      });
    });

    it('Should give a validation error if we try to create a thread with no creator', function (done) {
      var threadData = { title: "youpla" }
        , valErr;

      Thread.createAndSaveInstance(threadData, null, function (err, thread) {
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.creator.should.equal('required');
        _.keys(valErr).length.should.equal(1);

        Thread.createAndSaveInstance(threadData, undefined, function (err, thread) {
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.creator.should.equal('required');
          _.keys(valErr).length.should.equal(1);

          done();
        });
      });
    });

    it('Should save a thread that satisfies validation and initialize the posts array', function (done) {
      var threadData = { title: "youpla"
                     , unusedField: "test"
                     };

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        assert.isNull(err);
        thread.title.should.equal("youpla");
        thread.creator.toString().should.equal(user._id.toString());
        thread.posts.length.should.equal(0);
        thread.votes.should.equal(1);
        thread.alreadyVoted.length.should.equal(1);
        thread.alreadyVoted[0].toString().should.equal(user._id.toString());
        assert.isUndefined(thread.unusedField);

        done();
      });
    });

    it('Should have a virtual slug attribute out of the threads title', function (done) {
      var threadData = { title: "youpla boum tzing"
                     };

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        assert.isNull(err);
        thread.slug.should.equal("youpla-boum-tzing");

        done();
      });
    });

  });   // ==== End of 'createAndSaveInstance' ==== //


  describe('#addPost', function () {

    it('Should not add a new post if it doesnt pass validation', function (done) {
      var threadData = { title: "A title" }
        , postData = { text: "" }
        , valErr
        ;

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        thread.addPost(postData, user, function (err, post) {
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.text.should.equal(i18n.validatePostText);
          _.keys(valErr).length.should.equal(1);

          Thread.findOne({ _id: thread._id}, function (err, thread) {
            thread.posts.length.should.equal(0);
            done();
          });
        });
      });
    });

    it('Should add new posts to a thread if it passes validation. New posts are added at the end of the thread', function (done) {
      var threadData = { title: "A title" }
        , postData1 = { text: "first post yeaaah" }
        , postData2 = { text: "oh noes im only second" }
        ;

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        thread.addPost(postData1, user, function (err, post) {
          thread.addPost(postData2, user, function (err, post) {
            Thread.findOne({ _id: thread._id })
            .populate('posts')
            .exec(function (err, thread) {
              thread.posts.length.should.equal(2);
              thread.posts[0].text.should.equal('first post yeaaah');
              thread.posts[1].text.should.equal('oh noes im only second');

              done();
            });
          });
        });
      });
    });

    it('Should add a new post creator to the list of participants', function (done) {
      var threadData = { title: "A title" }
        , postData1 = { text: "first post yeaaah" }
        ;

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        thread.addPost(postData1, userbis, function (err, post) {
          Thread.findOne({ _id: thread._id })
          .exec(function (err, thread) {
            thread.participants.length.should.equal(1);
            thread.participants[0].toString().should.equal(userbis._id.toString());

            done();
          });
        });
      });
    });

    it('Should update lastPost.at iif someone posts succesfully to a thread', function (done) {
      var threadData = { title: "A title" }
        , postData1 = { text: "first post yeaaah" }
        , postData2 = { text: "oh noes im only second" }
        , date0, date1, date2, date3;

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        date0 = thread.lastPost.at;
        thread.addPost(postData1, user, function (err, post) {
          date1 = thread.lastPost.at;
          thread.addPost(postData2, user, function (err, post) {
            date2 = thread.lastPost.at;
            assert.isTrue(date1 - date0 > 0);
            assert.isTrue(date2 - date1 > 0);

            thread.addPost({}, user, function (err, post) {
              date3 = thread.lastPost.at;
              date3.should.equal(date2);

              done();
            });
          });
        });
      });
    });

    it('Should update lastPost.by iif someone posts succesfully to a thread', function (done) {
      var threadData = { title: "A title" }
        , postData1 = { text: "first post yeaaah" }
        , postData2 = { text: "oh noes im only second" };

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        thread.addPost(postData1, user, function (err, post) {
          thread.lastPost.by.toString().should.equal(user._id.toString());
          thread.addPost(postData2, userbis, function (err, post) {
            thread.lastPost.by.toString().should.equal(userbis._id.toString());
            thread.addPost({}, user, function (err, post) {
              assert.isDefined(err);
              thread.lastPost.by.toString().should.equal(userbis._id.toString());

              done();
            });
          });
        });
      });
    });

  });   // ==== End of '#addPost' ==== //


  describe('#createThreadAndFirstPost', function () {

    it('Should not be able to create a thread with first post if there are validation errors', function (done) {
      var threadData = { title: "Onnnnne title" }
        , postData = { text: "And aaaa text" }
        , valErr;

      // Test with a null user
      Thread.createThreadAndFirstPost(threadData, postData, null, function (err) {
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        _.keys(valErr).length.should.equal(1);
        assert.isDefined(valErr.creator);

        // Test with no post data
        Thread.createThreadAndFirstPost(threadData, {}, user, function (err) {
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          _.keys(valErr).length.should.equal(1);
          assert.isDefined(valErr.text);

          // Test with no thread data
          Thread.createThreadAndFirstPost({}, postData, user, function (err) {
            valErr = models.getAllValidationErrorsWithExplanations(err.errors);
            _.keys(valErr).length.should.equal(1);
            assert.isDefined(valErr.title);

            // Test with no data at all!
            Thread.createThreadAndFirstPost({}, {}, undefined, function (err) {
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

    it('Should able to create a thread with first post if everything is OK and add the creator to the participants', function (done) {
      var threadData = { title: "Onnnnne title" }
        , postData = { text: "And aaaa text" }
        , valErr;

      Thread.createThreadAndFirstPost(threadData, postData, user, function (err, thread) {
        assert.isNull(err);
        thread.title.should.equal("Onnnnne title");
        thread.posts.length.should.equal(1);
        thread.creator.toString().should.equal(user._id.toString());
        thread.participants.length.should.equal(1);
        thread.participants[0].toString().should.equal(user._id.toString());

        Post.findOne({ _id: thread.posts[0] }, function (err, post) {
          post.text.should.equal("And aaaa text");
          post.creator.toString().should.equal(user._id.toString());
          post.thread.toString().should.equal(thread._id.toString());

          done();
        });
      });

    });

  });   // ==== End of '#createThreadAndFirstPost' ==== //


  describe('#vote', function () {

    it('Should not be able to vote with no voter', function (done) {
      var threadData = { title: "youpla"
                     , unusedField: "test"
                     };

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        assert.isNull(err);
        thread.votes.should.equal(1);
        thread.alreadyVoted.length.should.equal(1);

        thread.vote(1, null, function (err, thread) {
          assert.isDefined(err.voter);

          done();
        });
      });
    });

    it('Should be able to vote but only once', function (done) {
      var threadData = { title: "youpla"
                     , unusedField: "test"
                     };

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        assert.isNull(err);
        thread.votes.should.equal(1);
        thread.alreadyVoted.length.should.equal(1);

        thread.vote(1, userbis, function (err, thread) {
          assert.isNull(err);
          thread.votes.should.equal(2);
          thread.alreadyVoted.indexOf(user._id).should.not.equal(-1);

          thread.vote(1, userbis, function (err, thread) {
            assert.isNull(err);
            thread.votes.should.equal(2);
            thread.alreadyVoted.indexOf(user._id).should.not.equal(-1);

            done();
          });
        });
      });
    });

    it('Should be able to downvote too', function (done) {
      var threadData = { title: "youpla"
                     , unusedField: "test"
                     };

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        assert.isNull(err);
        thread.votes.should.equal(1);
        thread.alreadyVoted.length.should.equal(1);

        thread.vote(-1, userbis, function (err, thread) {
          assert.isNull(err);
          thread.votes.should.equal(0);
          thread.alreadyVoted.indexOf(userbis._id).should.not.equal(-1);

          done();
        });
      });
    });

    it('By default, the vote is an upvote (string version)', function (done) {
      var threadData = { title: "youpla"
                     , unusedField: "test"
                     };

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        assert.isNull(err);
        thread.votes.should.equal(1);
        thread.alreadyVoted.length.should.equal(1);

        // A string instead of a number
        thread.vote("bloup", userbis, function (err, thread) {
          assert.isNull(err);
          thread.votes.should.equal(2);
          thread.alreadyVoted.indexOf(userbis._id).should.not.equal(-1);

          done();
        });
      });
    });

    it('By default, the vote is an upvote (undefined version)', function (done) {
      var threadData = { title: "youpla"
                     , unusedField: "test"
                     };

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        assert.isNull(err);
        thread.votes.should.equal(1);
        thread.alreadyVoted.length.should.equal(1);

        // undefined instead of a number
        thread.vote(undefined, userbis, function (err, thread) {
          assert.isNull(err);
          thread.votes.should.equal(2);
          thread.alreadyVoted.indexOf(userbis._id).should.not.equal(-1);

          done();
        });
      });
    });


  });   // ==== End of '#vote' ==== //


  describe('XSS prevention', function () {

    it('threads should be protected at creation against XSS', function (done) {
      var threadData = { title: "youpdocument.writela"
                     };

      Thread.createAndSaveInstance(threadData, user, function (err, thread) {
        thread.title.should.equal("youpla");
        done();
      });
    });

  });   // ==== End of 'XSS prevention' ==== //



});
