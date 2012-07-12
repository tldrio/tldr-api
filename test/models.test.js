/**
 * Models tests (all methods that are not specific to one model)
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
      done();
    });
  });


  describe('setTldrCreator', function () {

    it('Should work correctly', function (done) {
      var userData = { username: 'A name'
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
                console.log("===========");
                console.log(tldr1);
                console.log("===========");
                console.log(tldr2);
                console.log("===========");
                console.log(user);

                done();
              });
            });
          });
        });
      });
    });

  });


});
