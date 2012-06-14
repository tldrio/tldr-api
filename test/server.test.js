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

  // Synchronously saves an array of tldrs to the database. Used for tests that need a lot of tldrs in the database (getTldrsWithQuery for example)
  function saveSync(arr, idx, callback) {
    if (idx === arr.length) {
      return callback();
    }

    arr[idx].save(function(err) {
      if (err) {return done(err);}
      saveSync(arr, idx + 1, callback);
    });
  }

  beforeEach(function (done) {
    //create client to test api
    client = restify.createJsonClient({
      url: 'http://localhost:' + 8686,
    });
    //client.basicAuth('Magellan', 'VascoDeGama');

    // dummy models
    tldr1 = new TldrModel({url: 'http://needforair.com/nutcrackers', title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()});
    //We need an object ID for this one for PUT test
    tldr2 = new TldrModel({_id: mongoose.Types.ObjectId('111111111111111111111111'), url: 'http://avc.com/mba-monday', title:'mba-monday', summaryBullets: ['Fred Wilson is my God'], resourceAuthor: 'Fred', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}); 
    tldr3 = new TldrModel({url: 'http://bothsidesofthetable.com/deflationnary-economics', title: 'deflationary economics', summaryBullets: ['Sustering is my religion'], resourceAuthor: 'Mark', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()});
    tldr4 = new TldrModel({url: 'http://needforair.com/sopa', title: 'sopa', summaryBullets: ['Great article'], resourceAuthor: 'Louis', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()});

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

    it('an existing tldr', function (done) {

      client.get('/tldrs/search?url=' +encodeURIComponent('http://needforair.com/sopa'), function (err, req, res, obj) {
        res.statusCode.should.equal(200);
        obj.url.should.equal('http://needforair.com/sopa');
        done();
      });

    });

    it('GET a non existing tldr', function (done) {

      client.get('/tldrs/search?url=' + encodeURIComponent('http://3niggas4bitches.com'), function (err, req, res, obj) {
        var response = JSON.parse(res.body);
        res.statusCode.should.equal(404);
        response.should.have.ownProperty('message');
        response.message.should.equal('ResourceNotFound');
        done();
      });

    });

    it('GET with a non valid url', function (done) {

      client.get('/tldrs/search?url=' + encodeURIComponent('ftp://3niggas4bitches/com'), function (err, req, res, obj) {
        var response = JSON.parse(res.body);
        res.statusCode.should.equal(404);
        response.should.have.ownProperty('message');
        response.message.should.equal('ResourceNotFound');
        done();
      });

    });

    it('GET a non existing route', function (done) {

      client.get('/nonexistingroute', function (err, req, res, obj) {
        res.statusCode.should.equal(404);
        done();
      });

    });


    // This test will contain all we need to test this function as it takes some time to prepare the database every time
    it('Search tldrs with custom query', function (done) {
      var someTldrs = []
        , someFunctions = []
        , i, temp, now = new Date()
        , defaultLimit = 10
        , older;

      for (i = 0; i <= 25; i += 1) {
        temp = new Date(now - 10000 * (i + 1));
        someTldrs.push(new TldrModel({url: 'http://needforair.com/sopa/number' + i, title: 'sopa', summaryBullets: ['Great article'], resourceAuthor: 'Louis', resourceDate: new Date(), createdAt: new Date(), updatedAt: temp  }));
      }

      older = new Date(now - 10000 * (12));

      saveSync(someTldrs, 0, function() {
        TldrModel.find({}, function(err,docs) {
          docs.length.should.equal(30);

          // Tests that giving a negative limit value only gives up to defaultLimit (here 10) tldrs AND that they are the 10 most recent
          client.get('/tldrs/search?quantity=-1', function (err, req, res, obj) {
            obj.length.should.equal(defaultLimit);
            temp = _.map(obj, function (o) { return o.url; });
            _.indexOf(temp, 'http://bothsidesofthetable.com/deflationnary-economics').should.not.equal(-1);
            _.indexOf(temp, 'http://avc.com/mba-monday').should.not.equal(-1);
            _.indexOf(temp, 'http://needforair.com/nutcrackers').should.not.equal(-1);
            _.indexOf(temp, 'http://needforair.com/sopa').should.not.equal(-1);
            _.indexOf(temp, 'http://needforair.com/sopa/number0').should.not.equal(-1);
            _.indexOf(temp, 'http://needforair.com/sopa/number1').should.not.equal(-1);
            _.indexOf(temp, 'http://needforair.com/sopa/number2').should.not.equal(-1);
            _.indexOf(temp, 'http://needforair.com/sopa/number3').should.not.equal(-1);
            _.indexOf(temp, 'http://needforair.com/sopa/number4').should.not.equal(-1);
            _.indexOf(temp, 'http://needforair.com/sopa/number5').should.not.equal(-1);

            // A limit for 0 should give defaultLimit objects as well
            client.get('/tldrs/search?quantity=0', function (err, req, res, obj) {
              obj.length.should.equal(defaultLimit);

              // A limit greater than defaultLimit should give defaultLimit objects as well
              client.get('/tldrs/search?quantity=11', function (err, req, res, obj) {
                obj.length.should.equal(defaultLimit);

                // Forgetting the limit should force the handler to return defaultLimit objects
                client.get('/tldrs/search', function (err, req, res, obj) {
                  obj.length.should.equal(defaultLimit);

                  // Using it normally it should work! And return the 5 latest tldrs
                  client.get('/tldrs/search?quantity=5', function (err, req, res, obj) {
                    obj.length.should.equal(5);
                    temp = _.map(obj, function (o) { return o. url; });
                    _.indexOf(temp, 'http://bothsidesofthetable.com/deflationnary-economics').should.not.equal(-1);
                    _.indexOf(temp, 'http://avc.com/mba-monday').should.not.equal(-1);
                    _.indexOf(temp, 'http://needforair.com/nutcrackers').should.not.equal(-1);
                    _.indexOf(temp, 'http://needforair.com/sopa').should.not.equal(-1);
                    _.indexOf(temp, 'http://needforair.com/sopa/number0').should.not.equal(-1);

                    // Calling with a non-numeral value for limit should make it return defaultLimit tldrs
                    client.get('/tldrs/search?quantity=asd', function (err, req, res, obj) {
                      obj.length.should.equal(defaultLimit);

                      // Called with a non-numeral value for startat, it should use 0 as a default value
                      client.get('/tldrs/search?quantity=4&startat=rew', function (err, req, res, obj) {
                        obj.length.should.equal(4);
                        temp = _.map(obj, function (o) { return o. url; });
                        _.indexOf(temp, 'http://bothsidesofthetable.com/deflationnary-economics').should.not.equal(-1);
                        _.indexOf(temp, 'http://avc.com/mba-monday').should.not.equal(-1);
                        _.indexOf(temp, 'http://needforair.com/nutcrackers').should.not.equal(-1);
                        _.indexOf(temp, 'http://needforair.com/sopa').should.not.equal(-1);

                        // With normal values for startat and limit, it should behave normally
                        client.get('/tldrs/search?quantity=4&startat=5', function (err, req, res, obj) {
                          obj.length.should.equal(4);
                          temp = _.map(obj, function (o) { return o. url; });
                          _.indexOf(temp, 'http://needforair.com/sopa/number1').should.not.equal(-1);
                          _.indexOf(temp, 'http://needforair.com/sopa/number2').should.not.equal(-1);
                          _.indexOf(temp, 'http://needforair.com/sopa/number3').should.not.equal(-1);
                          _.indexOf(temp, 'http://needforair.com/sopa/number4').should.not.equal(-1);

                          // If startat is too high, no tldr is sent
                          client.get('/tldrs/search?quantity=4&startat=55', function (err, req, res, obj) {
                            obj.length.should.equal(0);

                            // If called with a correct number of milliseconds for olderthan, it works as expected (and ignores the startat parameter if any)
                            client.get('/tldrs/search?quantity=4&startat=3&olderthan='+older.getTime(), function (err, req, res, obj) {
                              obj.length.should.equal(4);
                              temp = _.map(obj, function (o) { return o. url; });
                              _.indexOf(temp, 'http://needforair.com/sopa/number12').should.not.equal(-1);
                              _.indexOf(temp, 'http://needforair.com/sopa/number13').should.not.equal(-1);
                              _.indexOf(temp, 'http://needforair.com/sopa/number14').should.not.equal(-1);
                              _.indexOf(temp, 'http://needforair.com/sopa/number15').should.not.equal(-1);

                              // If called with an incorrectly formated number of milliseconds (here a string), it should default to "older than now"
                              client.get('/tldrs/search?quantity=6&olderthan=123er5t3e', function (err, req, res, obj) {
                                obj.length.should.equal(6);
                                temp = _.map(obj, function (o) { return o. url; });
                                _.indexOf(temp, 'http://bothsidesofthetable.com/deflationnary-economics').should.not.equal(-1);
                                _.indexOf(temp, 'http://avc.com/mba-monday').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/nutcrackers').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/sopa').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/sopa/number0').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/sopa/number1').should.not.equal(-1);

                                // Convenience route should force the handler to return defaultLimit objects
                                client.get('/tldrs/search', function (err, req, res, obj) {
                                  obj.length.should.equal(defaultLimit);

                                  // Convenience route for latest tldrs should force the handler to return defaultstartat and olderthan objects
                                  client.get('/tldrs/latest/4', function (err, req, res, obj) {
                                    obj.length.should.equal(4);
                                    temp = _.map(obj, function (o) { return o. url; });
                                    _.indexOf(temp, 'http://bothsidesofthetable.com/deflationnary-economics').should.not.equal(-1);
                                    _.indexOf(temp, 'http://avc.com/mba-monday').should.not.equal(-1);
                                    _.indexOf(temp, 'http://needforair.com/nutcrackers').should.not.equal(-1);
                                    _.indexOf(temp, 'http://needforair.com/sopa').should.not.equal(-1);

                                    // Empty quantity will be intepreted as 0 so will return defaultLimit tldrs
                                    client.get('/tldrs/search?quantity=', function (err, req, res, obj) {
                                      obj.length.should.equal(defaultLimit);

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
              });
            });
          });
        });
      });

    });




  });



  //Test PUT Requests
  describe('Should handle PUT requests', function () {

    it('Should create a new tldr with POST if it doesn\'t exist yet, and return it', function (done) {
      var tldrData = {
        title: 'A title',
        url: 'http://yetanotherunusedurl.com/somepage',
        summaryBullets: ['A summary'],
        resourceAuthor: 'bozo le clown',
        resourceDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      client.post('/tldrs', tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(201);
        obj.title.should.equal('A title');
        obj.createdAt.should.not.be.null;
        TldrModel.find({}, function(err, docs) {
          var tldr;
          docs.length.should.equal(numberOfTldrs + 1);

          TldrModel.find({url: 'http://yetanotherunusedurl.com/somepage'}, function(err, docs) {
            tldr = docs[0];
            tldr.summaryBullets.should.include('A summary');

            done();
          });
        });
      });
    });


    it('Should update an existing tldr with PUT motherfucker', function (done) {
      var tldrData = { summaryBullets: ['A new summary'] };

      client.put('/tldrs/111111111111111111111111', tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(204);
        TldrModel.find({}, function(err, docs) {
          var tldr;
          docs.length.should.equal(numberOfTldrs);

          TldrModel.find({url: 'http://avc.com/mba-monday'}, function(err, docs) {
            tldr = docs[0];
            tldr.summaryBullets.should.include('A new summary');

            done();
          });
        });
      });
    });

    it('Should handle bad PUT request', function (done) {
      var tldrData = { summaryBullets: ['A new summary'] };

      client.put('/tldrs/thisisnotandobjetid', tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(500);
        done();
      });
    });

    it('Should handle PUT request with non existent', function (done) {

      var tldrData = { summaryBullets: ['A new summary'] };
      client.put('/tldrs/222222222222222222222222', tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(404);
        done();
      });
    });

    it('Shouldn\'t create a new tldr with POST if there is no url provided', function (done) {
      var tldrData = { 
         summaryBullets: ['summary'] };   // Summary can't be empty

      client.post('/tldrs', tldrData, function(err, req, res, obj) {
        var parsedError = JSON.parse(res.body);
        parsedError.should.have.property('url');
        res.statusCode.should.equal(403);
        TldrModel.find({}, function(err, docs) {
          docs.length.should.equal(numberOfTldrs);

          done();
        });
      });
    });

    it('Shouldn\'t create a new tldr with POST if there are validation errors', function (done) {
      var tldrData = { url: 'http://nfa.com' 
                     , summaryBullets: [''] };   // Summary can't be empty

      client.post('/tldrs', tldrData, function(err, req, res, obj) {
        var parsedError = JSON.parse(res.body);
        parsedError.should.have.property('summaryBullets');
        res.statusCode.should.equal(403);
        TldrModel.find({}, function(err, docs) {
          docs.length.should.equal(numberOfTldrs);

          done();
        });
      });
    });


    it('Should not update an existing tldr with PUT if there are validation errors', function (done) {
      var tldrData = { summaryBullets: [''] };

      client.put('/tldrs/111111111111111111111111', tldrData, function(err, req, res, obj) {
        var parsedError = JSON.parse(res.body);
        parsedError.should.have.property('summaryBullets');
        res.statusCode.should.equal(403);
        TldrModel.find({}, function(err, docs) {
          var tldr;
          docs.length.should.equal(numberOfTldrs);

          TldrModel.find({url: 'http://avc.com/mba-monday'}, function(err, docs) {
            tldr = docs[0];
            tldr.summaryBullets.should.include('Fred Wilson is my God');

            done();
          });
        });
      });
    });


    it('Should retrieve tldrs whose url have been normalized (same equivalence class)', function (done) {
      var tldrData = {
        url: 'http://yetanotherunusedurl.com/yomama',
        title: 'A title',
        summaryBullets: ['A summary'],
        resourceAuthor: 'bozo le clown',
        resourceDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      client.post('/tldrs', tldrData, function(err, req, res, obj) {
        res.statusCode.should.equal(201);

        client.get('/tldrs/search?url=' + encodeURIComponent('http://yetanotherunusedurl.com/yomama#ewrwerwr'), function (err, req, res, obj) {
          res.statusCode.should.equal(200);

          done();
        });
      });
    });



  });

});




