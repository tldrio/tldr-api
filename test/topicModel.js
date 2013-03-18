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


describe.only('Topic', function () {
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


});
