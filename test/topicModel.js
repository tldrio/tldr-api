var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , sinon = require('sinon')
  , mongoose = require('mongoose')
  , models = require('../lib/models')
  , Topic = models.Topic
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async')
  ;


describe('Topic', function () {
  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    Topic.remove({}, function () {
      done();
    });
  });


  it('One certain types are available', function (done) {
    var badTopicData = { type: 'nope', name: 'yep' }
      , goodTopicData = { type: 'category', name: 'yepyep' }
      , badTopic = new Topic(badTopicData)
      , goodTopic= new Topic(goodTopicData)
      ;

    badTopic.save(function (err) {
      var valErr = models.getAllValidationErrorsWithExplanations(err.errors);

      Object.keys(valErr).length.should.equal(1);
      valErr.type.should.equal(i18n.topic.badType);

      goodTopic.save(function (err, topic) {
        assert.isNull(err);
        topic.type.should.equal('category');
        topic.name.should.equal('yepyep');

        done();
      });
    });
  });

  it('Get all collections names', function (done) {
    var topicData1 = { type: 'category', name: 'yepyep' }
      , topicData2 = { type: 'category', name: 'again' }
      , topicData3 = { type: 'category', name: 'another' }
      ;

    Topic.createAndSaveInstance(topicData1, function (err) {
      Topic.createAndSaveInstance(topicData2, function (err) {
        Topic.createAndSaveInstance(topicData3, function (err) {
          Topic.getCategoriesNames(function(err, names) {
            names.length.should.equal(3);
            names.should.contain('yepyep');
            names.should.contain('again');
            names.should.contain('another');

            done();
          });
        });
      });
    });
  });

  it('createAndSaveInstance in safe mode doesnt spout an error on conflict', function (done) {
    var topicData = { type: 'category', name: 'same' }
      ;

    Topic.createAndSaveInstance(topicData, function (err) {
      // Unsafe creation: an error is raised
      Topic.createAndSaveInstance(topicData, { safe: false }, function (err) {
        err.code.should.equal(11000);
        Topic.find({}, function (err, topics) {
          topics.length.should.equal(1);

          // Safe creation: no error is raised
          Topic.createAndSaveInstance(topicData, { safe: true }, function (err, topic) {
            assert.isNull(err);
            assert.isUndefined(topic);
            Topic.find({}, function (err, topics) {
              topics.length.should.equal(1);

              done();
            });
          });
        });
      });
    });
  });

  it.only('Can get the ids of topics given their names, in batch too', function (done) {
    var topicData1 = { type: 'category', name: 'yepyep' }
      , topicData2 = { type: 'category', name: 'again' }
      , topicData3 = { type: 'category', name: 'another' }
      ;

    Topic.createAndSaveInstance(topicData1, function (err, topic1) {
      Topic.createAndSaveInstance(topicData2, function (err, topic2) {
        Topic.createAndSaveInstance(topicData3, function (err, topic3) {
          Topic.getIdsFromCategoryNames('again', function (err, topics) {
            topics.length.should.equal(1);
            topics[0].toString().should.equal(topic2._id.toString());

            Topic.getIdsFromCategoryNames(['yepyep', 'another'], function (err, topics) {
              topics = _.map(topics, function (t) { return t.toString(); });
              topics.length.should.equal(2);
              topics.should.contain(topic1._id.toString());
              topics.should.contain(topic3._id.toString());

              Topic.getIdsFromCategoryNames(['nothingtoseehere'], function (err, topics) {
                topics.length.should.equal(0);

                Topic.getIdsFromCategoryNames('', function (err, topics) {
                  topics.length.should.equal(0);

                  Topic.getIdsFromCategoryNames(undefined, function (err, topics) {
                    topics.length.should.equal(0);

                    Topic.getIdsFromCategoryNames('yepyep again', function (err, topics) {
                      topics = _.map(topics, function (t) { return t.toString(); });
                      topics.length.should.equal(2);
                      topics.should.contain(topic1._id.toString());
                      topics.should.contain(topic2._id.toString());

                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });


});
