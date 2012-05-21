/**
 * Server Tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , restify = require('restify')
  , bunyan = require('../lib/logger').bunyan 
  , server = require('../server')
  , models = require('../models')
  , db = require('../lib/db')
  , mongoose = require('mongoose')
  , async = require('async')
  , TldrModel = models.TldrModel
  , customUtils = require('../lib/customUtils');




/*
 * Start Server and Client
*/

//start server
server.listen(8686, function () {
});


/**
 * Tests
*/

describe('Webserver', function () {
  var tldr1, tldr2, tldr3, tldr4, numberOfTldrs
    , client;

  // The done arg is very important ! If absent tests run synchronously
  // that means there is n chance you receive a response to your request
  // before mocha quits 

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    //create client to test api
    client = restify.createJsonClient({
      url: 'http://localhost:' + 8686,
    });
    //client.basicAuth('Magellan', 'VascoDeGama');

    // dummy models
    tldr1 = new TldrModel({_id: 'http://needforair.com/nutcrackers', title:'nutcrackers', summaryBullet1: 'Awesome Blog', resourceAuthor: 'Charles', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()});
    tldr2 = new TldrModel({_id: 'http://avc.com/mba-monday', title:'mba-monday', summaryBullet1: 'Fred Wilson is my God', resourceAuthor: 'Fred', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()});
    tldr3 = new TldrModel({_id: 'http://bothsidesofthetable.com/deflationnary-economics', title: 'deflationary economics', summaryBullet1: 'Sustering is my religion', resourceAuthor: 'Mark', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()});
    tldr4 = new TldrModel({_id: 'http://needforair.com/sopa', title: 'sopa', summaryBullet1: 'Great article', resourceAuthor: 'Louis', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()});

    // clear database and repopulate
    TldrModel.remove(null, function (err) {
      if (err) {return done(err);}
      tldr1.save(	function (err) {
        if (err) {return done(err); }
        tldr2.save( function (err) {
          if (err) {return done(err); }
          tldr3.save( function (err) {
            if (err) {return done(err); }
            tldr4.save( function (err) {
              if (err) {return done(err); }

              TldrModel.find({}, function(err, docs) {
                if (err) {return done(err); }
                numberOfTldrs = docs.length;
                done();
              });

            });
          });
        });
      });
    });

  });

  afterEach(function (done) {
    TldrModel.remove(null, function (err) {
      if (err) {return done(err);}
      done();
    });
  });

  
  // Test GET requests
  describe('should handle GET request for', function () {

    it('an existing tldr STAGING VERSION', function (done) {

      client.get('/tldrs/'+encodeURIComponent('http://needforair.com/sopa'), function (err, req, res, obj) {
        res.statusCode.should.equal(200);
        obj._id.should.equal('http://needforair.com/sopa');
        done();
      });

    });

    it('GET a non existing tldr', function (done) {

      client.get('/tldrs/' + encodeURIComponent('http://3niggas4bitches.com'), function (err, req, res, obj) {
        var response = JSON.parse(res.body);
        res.statusCode.should.equal(404);
        response.should.have.ownProperty('code');
        response.code.should.equal('ResourceNotFound');
        done();
      });

    });

    it('GET all the tldrs', function (done) {

      client.get('/tldrs', function (err, req, res, obj) {
        var response = JSON.parse(res.body);
        res.statusCode.should.equal(403);
        response.should.have.ownProperty('code');
        response.code.should.equal('NotAuthorized');
        done();
      });

    });

    it('GET a non existing route', function (done) {

      client.get('/nonexistingroute', function (err, req, res, obj) {
        res.statusCode.should.equal(404);
        done();
      });

    });

	});



  //Test PUT Requests
  describe('Should handle PUT requests', function () {

    it('Should create a new tldr with PUT if it doesn\'t exist yet', function (done) {
      var tldrData = {
				title: 'A title',
				summaryBullet1: 'A summary',
				resourceAuthor: 'bozo le clown',
				resourceDate: new Date(),
			  createdAt: new Date(),
				updatedAt: new Date()
			};

      client.put('/tldrs/' + encodeURIComponent('http://yetanotherunusedurl.com/somepage'), tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(201);
        TldrModel.find({}, function(err, docs) {
          var tldr;
          docs.length.should.equal(numberOfTldrs + 1);

          TldrModel.find({_id: 'http://yetanotherunusedurl.com/somepage'}, function(err, docs) {
            tldr = docs[0];
            tldr.summaryBullet1.should.equal('A summary');

            done();
          });
        });
      });
    });


    it('Should update an existing tldr with PUT motherfucker', function (done) {
      var tldrData = { summaryBullet1: 'A new summary' };

      client.put('/tldrs/' + encodeURIComponent('http://avc.com/mba-monday'), tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(204);
        TldrModel.find({}, function(err, docs) {
          var tldr;
          docs.length.should.equal(numberOfTldrs);

          TldrModel.find({_id: 'http://avc.com/mba-monday'}, function(err, docs) {
            tldr = docs[0];
            tldr.summaryBullet1.should.equal('A new summary');

            done();
          });
        });
      });
    });


    it('Shouldn\'t create a new tldr with PUT if it doesn\'t exist yet but there are validation errors', function (done) {
      var tldrData = { summaryBullet1: '' };   // Summary can't be empty

      client.put('/tldrs/' + encodeURIComponent('http://wtf.com/'), tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(403);
        assert.isNotNull(obj.summaryBullet1);
        TldrModel.find({}, function(err, docs) {
          docs.length.should.equal(numberOfTldrs);

          done();
        });
      });
    });


    it('Should not update an existing tldr with PUT if there are validation errors', function (done) {
      var tldrData = { summaryBullet1: '' };

      client.put('/tldrs/' + encodeURIComponent('http://avc.com/mba-monday'), tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(403);
        TldrModel.find({}, function(err, docs) {
          var tldr;
          docs.length.should.equal(numberOfTldrs);

          TldrModel.find({_id: 'http://avc.com/mba-monday'}, function(err, docs) {
            tldr = docs[0];
            tldr.summaryBullet1.should.equal('Fred Wilson is my God');

            done();
          });
        });
      });
    });

  });

});




