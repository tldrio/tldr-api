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
, TldrModel = models.TldrModel
, customUtils = require('../lib/customUtils');




/*
 * Start Server and Client
*/

//create client to test api
client = restify.createJsonClient({
  url: 'http://localhost:' + 8686,
});
//start server
server.listen(8686, function () {
});






/**
 * Tests
*/

describe('Webserver', function () {
  var tldr1, tldr2, tldr3, tldr4;

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

    // dummy models
    tldr1 = TldrModel.createAndCraftInstance({url: 'http://needforair.com/nutcrackers', summary: 'Awesome Blog'});
    tldr2 = TldrModel.createAndCraftInstance({url: 'http://avc.com/mba-monday', summary: 'Fred Wilson is my God'});
    tldr3 = TldrModel.createAndCraftInstance({url: 'http://bothsidesofthetable.com/deflationnary-economics', summary: 'Sustering is my religion'});
    tldr4 = TldrModel.createAndCraftInstance({url: 'http://needforair.com/sopa', summary: 'Great article'});

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
              done();
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

    it('a non existing tldr', function (done) {

      client.get('/tldrs/3niggas4bitches', function (err, req, res, obj) {
        var response = JSON.parse(res.body);
        res.statusCode.should.equal(404);
        response.should.have.ownProperty('code');
        response.code.should.equal('ResourceNotFound');
        done();
      });

    });

    it('all the tldrs', function (done) {

      client.get('/tldrs', function (err, req, res, obj) {
        var response = JSON.parse(res.body);
        res.statusCode.should.equal(403);
        response.should.have.ownProperty('code');
        response.code.should.equal('NotAuthorized');
        done();
      });

    });

    it('a non existing route', function (done) {

      client.get('/*', function (err, req, res, obj) {
        res.statusCode.should.equal(404);

        client.get('/notexistingroute', function (err, req, res, obj) {
          res.statusCode.should.equal(404);
          done();
        });
      });

    });

    it('all tldrs for an existing given hostname', function (done) {

      client.get('/domains/needforair.com/tldrs', function (err, req, res, obj) {
        obj.length.should.equal(2);
        _.any(obj, function(value) {return value.summary === "Awesome Blog";} ).should.equal(true);
        _.any(obj, function(value) {return value.summary === "Great article";} ).should.equal(true);
        done();
      });

    });

    it('all tldrs for a non-existing hostname (return empty array)', function (done) {

      client.get('/domains/unusedDomain.com/tldrs', function (err, req, res, obj) {
        obj.length.should.equal(0);
        done();
      });

    });


    it('should return the latest tldrs correctly', function (done) {
      //tldr1.lastUpdated = new Date(2020, 04, 10, 12);
      //tldr2.lastUpdated = new Date(2020, 06, 10, 12);
      //tldr3.lastUpdated = new Date(2020, 02, 10, 12);
      //tldr4.lastUpdated = new Date(2021, 00, 10, 12);

      TldrModel.update({_id: tldr1._id}, {lastUpdated: new Date(2020, 04, 10, 12)}, {}, function() {
        TldrModel.update({_id: tldr2._id}, {lastUpdated: new Date(2020, 06, 10, 12)}, {}, function() {
          TldrModel.update({_id: tldr3._id}, {lastUpdated: new Date(2020, 02, 10, 12)}, {}, function() {
            TldrModel.update({_id: tldr4._id}, {lastUpdated: new Date(2021, 00, 10, 12)}, {}, function() {
              client.get('/tldrs/latest/2', function (err, req, res, obj) {
                obj.length.should.equal(2);
                _.any(obj, function(value) {return value.summary === "Great article"} ).should.equal(true);
                _.any(obj, function(value) {return value.summary === "Fred Wilson is my God"} ).should.equal(true);

                client.get('/tldrs/latest/12', function (err, req, res, obj) {
                  obj.length.should.equal(4);

                  done();
                });
              });
            });
          });
        });
      });
    });


    it('should not return any tldr if called with 0 or a negative number', function (done) {

      client.get('/tldrs/latest/0', function (err, req, res, obj) {
        obj.length.should.equal(0);

        client.get('/tldrs/latest/-2', function (err, req, res, obj) {
          obj.length.should.equal(0);

          done();
        });

      });

    });


    it('should not return more than 20 tldrs', function (done) {
      var toCreate = [], i;

      // Create dummy entries in the database
      for (i = 0; i < 34; i++) {tldr1.url = "http://test.com/" + i; toCreate.push(TldrModel.createAndCraftInstance(tldr1));}

      customUtils.chainSave(toCreate, function() {
        client.get('/tldrs/latest/123', function (err, req, res, obj) {
          obj.length.should.equal(20);

          done();
        });
      });
    });
  });



  //Test POST Requests
  describe('should handle POST request', function () {

    it('for /tldrs route with no url provided in body and return an error', function (done) {
      var tldrData = {
						summary: 'This is a summary', 
						unusedFields: 'toto'};

			client.post('/tldrs', tldrData, function (err, req, res, obj) {
				res.statusCode.should.equal(409);
				err.name.should.equal('MissingParameterError');
				done();
			});

    });

    it('for /tldrs route with no summary provided in body and return error', function (done) {

      var tldrData = {
						url: 'http://toto.com', 
						unusedFields: 'toto'};

			client.post('/tldrs', tldrData, function (err, req, res, obj) {
				res.statusCode.should.equal(400);
				err.name.should.equal('InvalidContentError');
				done();
			});

    });

    it('for creating a new tldr', function (done) {

      var tldrData = {
						url: 'http://www.youporn.com/milf',
						summary: 'Sluts and cockslapers', 
						unusedFields: "coin"}
        , tldr = TldrModel.createAndCraftInstance(tldrData);

			TldrModel.find({_id: tldr._id} , function (err, docs) {

				if (err) { throw err;}
				
				//Check tldr doesn't exist
				docs.length.should.equal(0);

				client.post('/tldrs', tldrData, function (err, req, res, obj) {

					res.statusCode.should.equal(200);
					obj._id.should.equal(tldr._id);
					obj.summary.should.equal(tldrData.summary);
					obj.should.not.have.property('unusedFields');

					TldrModel.find({_id: tldr._id} , function (err, docs) {
						if (err) { throw err;}
						// Check POST request created entry in DB
						docs.length.should.equal(1);      
						docs[0].url.should.equal(tldrData.url);
						done();
					});

				});

			});

    });


    it('for consecutive double post with same data', function(done) {
			
      var tldrData = {
				    url: 'http://www.youporn.com/milf',
            summary: 'Sluts and cockslapers'}
        , tldr = TldrModel.createAndCraftInstance(tldrData);

			client.post('/tldrs', tldrData, function (err, req, res, obj) {

				res.statusCode.should.equal(200);
				obj._id.should.equal(tldr._id);
				obj.summary.should.equal(tldrData.summary);

				client.post('/tldrs',tldrData, function(err, req, res, obj) {
					res.statusCode.should.equal(200);
					done();
				});

			});

    });


    it('updating an existing tldr', function (done) {

      var tldrUpdates = {
				    url: 'http://needforair.com/nutcrackers'
          , summary: 'This blog smells like shit'}
        , tldr = TldrModel.createAndCraftInstance(tldrUpdates);

			TldrModel.find({_id: tldr._id}, function (err, docs) {
				if (err) {throw err;}

				docs.length.should.equal(1);
				docs[0].summary.should.equal('Awesome Blog');

				client.post('/tldrs', tldrUpdates, function (err, req, res, obj) {
					res.statusCode.should.equal(200);
					obj._id.should.equal(tldr._id);
					obj.summary.should.equal('This blog smells like shit');

					TldrModel.find({_id: tldr._id}, function(err, docs) {
						assert.isTrue(docs[0].lastUpdated - docs[0].dateCreated > 0);

						done();
					});

				});

			});

    });


    it('and not allow direct post to specified id', function (done) {

      var tldrUpdates = {summary: 'This blog smells like shit', url: "ytr.fr"};

      client.post('/tldrs/c63588884fecf318d1wwwwwf3598b19f4f461d21', tldrUpdates, function (err, req, res, obj) {
        res.statusCode.should.equal(405);
        done();
      });

    });

  });

});




