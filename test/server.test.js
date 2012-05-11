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
    client.basicAuth('Magellan', 'VascoDeGama');

    // dummy models
    tldr1 = TldrModel.createInstance({url: 'http://needforair.com/nutcrackers', summary: 'Awesome Blog'});
    tldr2 = TldrModel.createInstance({url: 'http://avc.com/mba-monday', summary: 'Fred Wilson is my God'});
    tldr3 = TldrModel.createInstance({url: 'http://bothsidesofthetable.com/deflationnary-economics', summary: 'Sustering is my religion'});
    tldr4 = TldrModel.createInstance({url: 'http://needforair.com/sopa', summary: 'Great article'});

    // clear database and repopulate
    TldrModel.remove(null, function (err) {
      if (err) {throw done(err);}
      tldr1.save(	function (err) {
        if (err) {throw done(err); }
        tldr2.save( function (err) {
          if (err) {throw done(err); }
          tldr3.save( function (err) {
            if (err) {throw done(err); }
            tldr4.save( function (err) {
              if (err) {throw done(err); }

              TldrModel.find({}, function(err, docs) {
                if (err) {throw done(err); }
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
      if (err) {throw done(err);}

      done();
    });

  });

  
  // Test GET requests
  describe('should handle GET request for', function () {

    it('an existing tldr', function (done) {

      client.get('/tldrs/c63588884fecf318d13fc3cf3598b19f4f461d21', function (err, req, res, obj) {
        res.statusCode.should.equal(200);
        obj.url.should.equal('http://needforair.com/nutcrackers');
        done();
      });

    });

    it('GET a non existing tldr', function (done) {

      client.get('/tldrs/3niggas4bitches', function (err, req, res, obj) {
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

      client.get('/notexistingroute', function (err, req, res, obj) {
        res.statusCode.should.equal(404);
        done();
      });

    });

    it('GET all tldrs for an existing given hostname', function (done) {

      client.get('/domains/needforair.com/tldrs', function (err, req, res, obj) {
        obj.length.should.equal(2);
        _.any(obj, function(value) {return value.summary === "Awesome Blog";} ).should.equal(true);
        _.any(obj, function(value) {return value.summary === "Great article";} ).should.equal(true);
        done();
      });

    });

    it('GET all tldrs for a non-existing hostname (return empty array)', function (done) {

      client.get('/domains/unusedDomain.com/tldrs', function (err, req, res, obj) {
        obj.length.should.equal(0);
        done();
      });

    });


    it('GET the latest tldrs correctly', function (done) {
      //tldr1.updatedAt = new Date(2020, 04, 10, 12);
      //tldr2.updatedAt = new Date(2020, 06, 10, 12);
      //tldr3.updatedAt = new Date(2020, 02, 10, 12);
      //tldr4.updatedAt = new Date(2021, 00, 10, 12);

      TldrModel.update({_id: tldr1._id}, {updatedAt: new Date(2020, 04, 10, 12)}, {}, function() {
        TldrModel.update({_id: tldr2._id}, {updatedAt: new Date(2020, 06, 10, 12)}, {}, function() {
          TldrModel.update({_id: tldr3._id}, {updatedAt: new Date(2020, 02, 10, 12)}, {}, function() {
            TldrModel.update({_id: tldr4._id}, {updatedAt: new Date(2021, 00, 10, 12)}, {}, function() {
              client.get('/tldrs?sort=latest&limit=2', function (err, req, res, obj) {
                obj.length.should.equal(2);
                _.any(obj, function(value) {return value.summary === "Great article"} ).should.equal(true);
                _.any(obj, function(value) {return value.summary === "Fred Wilson is my God"} ).should.equal(true);

                client.get('/tldrs?sort=latest&limit=12', function (err, req, res, obj) {
                  obj.length.should.equal(4);

                  done();
                });
              });
            });
          });
        });
      });
    });


    it('GET should not return any tldr if called with 0 or a negative number', function (done) {

      client.get('/tldrs?sort=latest&limit=0', function (err, req, res, obj) {
        obj.length.should.equal(0);

        client.get('/tldrs?sort=latest&limit=-2', function (err, req, res, obj) {
          obj.length.should.equal(0);

          done();
        });

      });

    });


    it('GET should not return more than 20 tldrs', function (done) {
      var toExecute = []
        , i;

      // Create dummy entries in the database
      for (i = 0; i < 34; i++) {
        (function (i) {
          var newTldr
            , saveTldr;

          newTldr = TldrModel.createInstance({url: 'http://test.com/'+i
                                            , summary: 'testsummary'
                                            , resourceAuthor: 'Me'});

          saveTldr = function (callback) {
            newTldr.save( function (err) {
              if (err) { callback(err); }
              callback(null);
            });
          };

          toExecute.push(saveTldr);
        }(i));
      }

      async.series(toExecute, function (err, results) {
        if (err) { throw(err); }
        client.get('/tldrs?sort=latest&limit=123', function (err, req, res, obj) {
          obj.length.should.equal(20);
          done();
        });

      });

    });

  });



  //Test POST Requests
  describe('Should handle PUT requests', function () {

    it('Shouldn\'t be able to PUT a tldr if no url is provided', function (done) {
      var tldrData = {
            summary: 'This is a summary',
            unusedFields: 'toto'};

      client.put('/tldrs', tldrData, function (err, req, res, obj) {
        res.statusCode.should.equal(403);
        assert.isNotNull(res.url);
        done();
      });
    });


    it('Should create a new tldr with PUT if it doesn\'t exist yet', function (done) {
      var tldrData = {
            url: 'http://yetanotherunusedurl.tld/somepage'
          , summary: 'A summary' }
        , tldr;

      client.put('/tldrs', tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(200);
        TldrModel.find({}, function(err, docs) {
          docs.length.should.equal(numberOfTldrs + 1);

          TldrModel.find({url: tldrData.url}, function(err, docs) {
            tldr = docs[0];
            tldr.url.should.equal('http://yetanotherunusedurl.tld/somepage');
            tldr.hostname.should.equal('yetanotherunusedurl.tld');
            tldr.summary.should.equal('A summary');

            done();
          });
        });
      });
    });


    it('Should update an existing tldr with PUT', function (done) {
      var tldrData = {
            url: 'http://avc.com/mba-monday'
          , summary: 'A new summary' }
        , tldr;

      client.put('/tldrs', tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(200);
        TldrModel.find({}, function(err, docs) {
          docs.length.should.equal(numberOfTldrs);

          TldrModel.find({url: tldrData.url}, function(err, docs) {
            tldr = docs[0];
            tldr.url.should.equal('http://avc.com/mba-monday');
            tldr.hostname.should.equal('avc.com');
            tldr.summary.should.equal('A new summary');

            done();
          });
        });
      });
    });


    it('Shouldn\'t create a new tldr with PUT if it doesn\'t exist yet but there are validation errors', function (done) {
      var tldrData = {
            url: 'http://yetanotherunusedurl.tld/somepage'
          , summary: '' }   // Summary can't be empty
        , tldr;

      client.put('/tldrs', tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(403);
        assert.isNotNull(obj.summary);
        TldrModel.find({}, function(err, docs) {
          docs.length.should.equal(numberOfTldrs);

          done();
        });
      });
    });


    it('Should not update an existing tldr with PUT if there are validation errors', function (done) {
      var tldrData = {
            url: 'http://avc.com/mba-monday'
          , summary: '' }
        , tldr;

      client.put('/tldrs', tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(403);
        TldrModel.find({}, function(err, docs) {
          docs.length.should.equal(numberOfTldrs);

          TldrModel.find({url: tldrData.url}, function(err, docs) {
            tldr = docs[0];
            tldr.url.should.equal('http://avc.com/mba-monday');
            tldr.hostname.should.equal('avc.com');
            tldr.summary.should.equal('Fred Wilson is my God');

            done();
          });
        });
      });
    });






  });

});




