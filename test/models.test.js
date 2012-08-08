/**
 * Models tests (all methods that are not specific to one model)
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , sinon = require('sinon')
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../models')
  , User = models.User
  , Tldr = models.Tldr
  , server = require('../server')
  , db = server.db;



/**
 * Tests
 */


describe('Models', function () {

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    User.remove( function (err) {
      if (err) {throw done(err);}
      Tldr.remove(function (err) {
        if (err) {throw done(err);}
        done();
      })
    });
  });


  describe('setTldrCreator', function () {

    it('Should link multiple tldrs with their creator', function (done) {
      var userData = { username: 'NFADeploy'
                     , email: 'valid@email.com'
                     , password: 'supersecret!'
                     }
        , tldrData1 = { url: 'http://myfile.com/movie',
                       title: 'Blog NFA',
                       summaryBullets: ['Awesome Blog'],
                       resourceAuthor: 'NFA Crew',
                       resourceDate: '2012',
                       createdAt: new Date(),
                       updatedAt: new Date()
                     }
        , tldrData2 = { url: 'http://another.com/movie',
                       title: 'Blog NFA',
                       summaryBullets: ['Awesome Blog', 'Another bullet'],
                       resourceAuthor: 'NFA Crew',
                       resourceDate: '2012',
                       createdAt: new Date(),
                       updatedAt: new Date()
                     };

      User.createAndSaveInstance(userData, function(err, user) {
        Tldr.createAndSaveInstance(tldrData1, function(err, tldr1) {
          Tldr.createAndSaveInstance(tldrData2, function(err, tldr2) {
            models.setTldrCreator(tldr1, user, function(err) {
              models.setTldrCreator(tldr2, user, function(err) {
                // Linking should have put the correct ObjectIds in the objects, not the referenced objects themselves
                tldr1.creator.should.equal(user._id);
                tldr2.creator.should.equal(user._id);
                user.tldrsCreated.indexOf(tldr1._id).should.not.equal(-1);
                user.tldrsCreated.indexOf(tldr2._id).should.not.equal(-1);

                // Using find() and populate, we should get all referenced objects themselves
                User.findOne({email: 'valid@email.com'})
                  .populate('tldrsCreated')
                  .exec(function (err, refoundUser) {
                    // We get the tldrs objects, in the order they were linked
                    refoundUser.tldrsCreated[0].url.should.equal('http://myfile.com/movie');
                    refoundUser.tldrsCreated[1].url.should.equal('http://another.com/movie');

                    // We can also populate the creator field
                    Tldr.findOne({url: 'http://myfile.com/movie'})
                      .populate('creator')
                      .exec(function (err, refoundTldr1) {
                        refoundTldr1.creator.email.should.equal('valid@email.com');

                        Tldr.findOne({url: 'http://another.com/movie'})
                          .populate('creator')
                          .exec(function (err, refoundTldr1) {
                            refoundTldr1.creator.email.should.equal('valid@email.com');

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

    it('should not link anything and throw an error if the tldr or the creator is not supplied', function (done) {
      var userData = { username: 'NFADeploy'
                     , email: 'valid@email.com'
                     , password: 'supersecret!'
                     }
        , tldrData1 = { url: 'http://myfile.com/movie',
                       title: 'Blog NFA',
                       summaryBullets: ['Awesome Blog'],
                       resourceAuthor: 'NFA Crew',
                       resourceDate: '2012',
                       createdAt: new Date(),
                       updatedAt: new Date()
                     }

      User.createAndSaveInstance(userData, function(err, user) {
        Tldr.createAndSaveInstance(tldrData1, function(err, tldr1) {
          (function() { models.setTldrCreator(tldr1); }).should.throw();
          (function() { models.setTldrCreator(null, user); }).should.throw();
          (function() { models.setTldrCreator(undefined, user); }).should.throw();

          done();
        });
      })
    });

  });


  describe('getDuplicateErrorNiceFormat', function() {
    it('should correctly extract the duplicated field if the error is formatted as expected', function (done) {
      var error1 = { name: 'MongoError'   // An actual duplicate error on update
                   , err: 'E11000 duplicate key error index: test-db.users.$username_1  dup key: { : "ANOTHER" }'
                   , code: 11001
                   , n: 0
                   , connectionId: 64
                   , ok: 1 }
        , error2 = { name: 'MongoError'   // An actual duplicate error on create
                   , err: 'E11000 duplicate key error index: dev-db.users.$email_1  dup key: { : "a@b.com" }'
                   , code: 11000
                   , n: 0
                   , connectionId: 66
                   , ok: 1 };

      models.getDuplicateField(error1).should.equal("username");
      models.getDuplicateField(error2).should.equal("email");

      done();
    });

    it('should throw an error if the function is called on a non duplicate error', function (done) {
      var error1 = { name: 'MongoError'   // An actual duplicate error on update
                   , err: 'E11000 duplicate key error index: test-db.users.$username_1  dup key: { : "ANOTHER" }'
                   , code: 10999
                   , n: 0
                   , connectionId: 64
                   , ok: 1 };

      (function() { models.getDuplicateField(error1); }).should.throw();

      done();
    });

    it('Should return "unknown" if the error is not formatted as expected', function (done) {
      var error1 = { name: 'MongoError'   // An actual duplicate error on update
                   , err: 'E11000 duplicate key erro_r index: test-db.users.$username_1  dup key: { : "ANOTHER" }'
                   , code: 11000
                   , n: 0
                   , connectionId: 64
                   , ok: 1 };

      models.getDuplicateField(error1).should.equal("unknown");

      done();
    });


  });


});
