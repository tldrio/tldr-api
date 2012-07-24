/**
 * Server Tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , server = require('../server')
  , models = require('../models')
  , db = server.db
  , mongoose = require('mongoose')
  , async = require('async')
  , Tldr = models.Tldr
  , User = models.User
  , rootUrl = 'http://localhost:8686'
  , request = require('request');




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
    db.connectToDatabase(function() {
      done();
    });
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

    // dummy models
    tldr1 = new Tldr({url: 'http://needforair.com/nutcrackers', title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()});
    //We need an object ID for this one for PUT test
    tldr2 = new Tldr({_id: mongoose.Types.ObjectId('111111111111111111111111'), url: 'http://avc.com/mba-monday', title:'mba-monday', summaryBullets: ['Fred Wilson is my God'], resourceAuthor: 'Fred', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}); 
    tldr3 = new Tldr({url: 'http://bothsidesofthetable.com/deflationnary-economics', title: 'deflationary economics', summaryBullets: ['Sustering is my religion'], resourceAuthor: 'Mark', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()});
    tldr4 = new Tldr({url: 'http://needforair.com/sopa', title: 'sopa', summaryBullets: ['Great article'], resourceAuthor: 'Louis', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()});

    // clear database and repopulate
    Tldr.remove({}, function (err) {
      if (err) { return done(err); }
      tldr1.save(	function (err) {
        if (err) { return done(err); }
        tldr2.save( function (err) {
          if (err) { return done(err); }
          tldr3.save( function (err) {
            if (err) { return done(err); }
            tldr4.save( function (err) {
              if (err) { return done(err); }
              Tldr.find({}, function(err, docs) {
                if (err) { return done(err); }
                numberOfTldrs = docs.length;
                User.remove({}, function(err) {
                  if (err) { return done(err); }
                  User.createAndSaveInstance({email: "user1@nfa.com", username: "User One", password: "supersecret"}, function(err) {
                    if (err) { return done(err); }
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

  afterEach(function (done) {
    Tldr.remove({}, function (err) {
      if (err) {return done(err);}
      done();
    });
  });


  // Test GET requests
  describe('should handle GET request for', function () {

    it('an existing tldr given an url with /tldrs/search?', function (done) {

      request.get({ headers: {"Accept": "application/json"}
                  , uri: rootUrl + '/tldrs/search?url=' + encodeURIComponent('http://needforair.com/sopa') }, function (error, response, body) {
        var obj = JSON.parse(body);
        response.statusCode.should.equal(200);
        obj.url.should.equal('http://needforair.com/sopa');
        done();
      });

    });

    it('a non existing tldr given an url with /tldrs/search?', function (done) {

      request.get({ uri: rootUrl + '/tldrs/search?url=' + encodeURIComponent('http://3niggas4bitches.com') }, function (err, res, body) {
        var obj = JSON.parse(res.body);
        res.statusCode.should.equal(404);
        obj.should.have.ownProperty('message');
        obj.message.should.equal('ResourceNotFound');
        done();
      });

    });

    it('an existing tldr given an _id with /tldrs/:id', function (done) {

      request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/111111111111111111111111'}, function (err, res, body) {
        var obj = JSON.parse(res.body);
        res.statusCode.should.equal(200);
        obj.url.should.equal('http://avc.com/mba-monday');
        done();
      });

    });

    it('should reply with a 403 to a GET /tldrs/:id if the objectId is not valid (not a 24 characters string)', function (done) {

      request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/invalidId'}, function (err, res, body) {
        var obj = JSON.parse(res.body);
        res.statusCode.should.equal(403);
        assert.isNotNull(obj._id);
        done();
      });

    });

    it('a non existing route', function (done) {

      request.get({uri: rootUrl + '/nonexistingroute'}, function (err, res, body) {
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
        , older, obj;

      for (i = 0; i <= 25; i += 1) {
        temp = new Date(now - 10000 * (i + 1));
        someTldrs.push(new Tldr({url: 'http://needforair.com/sopa/number' + i, title: 'sopa', summaryBullets: ['Great article'], resourceAuthor: 'Louis', resourceDate: new Date(), createdAt: new Date(), updatedAt: temp  }));
      }

      older = new Date(now - 10000 * (12));

      saveSync(someTldrs, 0, function() {
        Tldr.find({}, function(err,docs) {
          docs.length.should.equal(30);

          // Tests that giving a negative limit value only gives up to defaultLimit (here 10) tldrs AND that they are the 10 most recent
          request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?quantity=-1'}, function (err, res, body) {
            obj = JSON.parse(res.body);
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
            request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?quantity=0'}, function (err, res, body) {
              obj = JSON.parse(res.body);
              obj.length.should.equal(defaultLimit);

              // A limit greater than defaultLimit should give defaultLimit objects as well
              request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?quantity=11'}, function (err, res, body) {
                obj = JSON.parse(res.body);
                obj.length.should.equal(defaultLimit);

                // Forgetting the limit should force the handler to return defaultLimit objects
                request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search'}, function (err, res, body) {
                  obj = JSON.parse(res.body);
                  obj.length.should.equal(defaultLimit);

                  // Using it normally it should work! And return the 5 latest tldrs
                  request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?quantity=5'}, function (err, res, body) {
                    obj = JSON.parse(res.body);
                    obj.length.should.equal(5);
                    temp = _.map(obj, function (o) { return o. url; });
                    _.indexOf(temp, 'http://bothsidesofthetable.com/deflationnary-economics').should.not.equal(-1);
                    _.indexOf(temp, 'http://avc.com/mba-monday').should.not.equal(-1);
                    _.indexOf(temp, 'http://needforair.com/nutcrackers').should.not.equal(-1);
                    _.indexOf(temp, 'http://needforair.com/sopa').should.not.equal(-1);
                    _.indexOf(temp, 'http://needforair.com/sopa/number0').should.not.equal(-1);

                    // Calling with a non-numeral value for limit should make it return defaultLimit tldrs
                    request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?quantity=asd'}, function (err, res, body) {
                      obj = JSON.parse(res.body);
                      obj.length.should.equal(defaultLimit);

                      // Called with a non-numeral value for startat, it should use 0 as a default value
                      request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?quantity=4&startat=rew'}, function (err, res, body) {
                        obj = JSON.parse(res.body);
                        obj.length.should.equal(4);
                        temp = _.map(obj, function (o) { return o. url; });
                        _.indexOf(temp, 'http://bothsidesofthetable.com/deflationnary-economics').should.not.equal(-1);
                        _.indexOf(temp, 'http://avc.com/mba-monday').should.not.equal(-1);
                        _.indexOf(temp, 'http://needforair.com/nutcrackers').should.not.equal(-1);
                        _.indexOf(temp, 'http://needforair.com/sopa').should.not.equal(-1);

                        // With normal values for startat and limit, it should behave normally
                        request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?quantity=4&startat=5'}, function (err, res, body) {
                          obj = JSON.parse(res.body);
                          obj.length.should.equal(4);
                          temp = _.map(obj, function (o) { return o. url; });
                          _.indexOf(temp, 'http://needforair.com/sopa/number1').should.not.equal(-1);
                          _.indexOf(temp, 'http://needforair.com/sopa/number2').should.not.equal(-1);
                          _.indexOf(temp, 'http://needforair.com/sopa/number3').should.not.equal(-1);
                          _.indexOf(temp, 'http://needforair.com/sopa/number4').should.not.equal(-1);

                          // If startat is too high, no tldr is sent
                          request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?quantity=4&startat=55'}, function (err, res, body) {
                            obj = JSON.parse(res.body);
                            obj.length.should.equal(0);

                            // If called with a correct number of milliseconds for olderthan, it works as expected (and ignores the startat parameter if any)
                            request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?quantity=4&startat=3&olderthan=' + older.getTime()}, function (err, res, body) {
                              obj = JSON.parse(res.body);
                              obj.length.should.equal(4);
                              temp = _.map(obj, function (o) { return o. url; });
                              _.indexOf(temp, 'http://needforair.com/sopa/number12').should.not.equal(-1);
                              _.indexOf(temp, 'http://needforair.com/sopa/number13').should.not.equal(-1);
                              _.indexOf(temp, 'http://needforair.com/sopa/number14').should.not.equal(-1);
                              _.indexOf(temp, 'http://needforair.com/sopa/number15').should.not.equal(-1);

                              // If called with an incorrectly formated number of milliseconds (here a string), it should default to "older than now"
                              request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?quantity=6&olderthan=123er5t3e'}, function (err, res, body) {
                                obj = JSON.parse(res.body);
                                obj.length.should.equal(6);
                                temp = _.map(obj, function (o) { return o. url; });
                                _.indexOf(temp, 'http://bothsidesofthetable.com/deflationnary-economics').should.not.equal(-1);
                                _.indexOf(temp, 'http://avc.com/mba-monday').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/nutcrackers').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/sopa').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/sopa/number0').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/sopa/number1').should.not.equal(-1);

                                // Convenience route should force the handler to return defaultLimit objects
                                request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search'}, function (err, res, body) {
                                  obj = JSON.parse(res.body);
                                  obj.length.should.equal(defaultLimit);

                                  // Convenience route for latest tldrs should force the handler to return defaultstartat and olderthan objects
                                  request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/latest/4'}, function (err, res, body) {
                                    obj = JSON.parse(res.body);
                                    obj.length.should.equal(4);
                                    temp = _.map(obj, function (o) { return o. url; });
                                    _.indexOf(temp, 'http://bothsidesofthetable.com/deflationnary-economics').should.not.equal(-1);
                                    _.indexOf(temp, 'http://avc.com/mba-monday').should.not.equal(-1);
                                    _.indexOf(temp, 'http://needforair.com/nutcrackers').should.not.equal(-1);
                                    _.indexOf(temp, 'http://needforair.com/sopa').should.not.equal(-1);

                                    // Empty quantity will be intepreted as 0 so will return defaultLimit tldrs
                                    request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?quantity='}, function (err, res, body) {
                                      obj = JSON.parse(res.body);
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


    it('Should serve tldr-page if accept header is text/html', function (done) {
      request.get({ headers: {"Accept": "text/html"}, uri: rootUrl + '/tldrs/111111111111111111111111'}, function (err, res, body) {
        res.statusCode.should.equal(200);
        res.headers['content-type'].should.contain('text/html');
        res.body.should.contain('<div id="tldr-container">');
        done();
      });

    });

  });



  //Test POST Requests
  describe('Should handle POST requests', function () {

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

      request.post({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs'}, function (err, res, obj) {
        res.statusCode.should.equal(201);
        obj.title.should.equal('A title');
        obj.createdAt.should.not.be.null;
        Tldr.find({}, function(err, docs) {
          var tldr;
          docs.length.should.equal(numberOfTldrs + 1);

          Tldr.find({url: 'http://yetanotherunusedurl.com/somepage'}, function(err, docs) {
            tldr = docs[0];
            tldr.summaryBullets.should.include('A summary');

            done();
          });
        });
      });
    });

    it('Should handle POST request as an update if tldr already exists', function (done) {
      var tldrData = {url: 'http://needforair.com/nutcrackers'
        , title:'Nutcrackers article'
        , summaryBullets: ['Best Blog Ever']
        , resourceAuthor: 'Migli'
        , resourceDate: new Date()
        , createdAt: new Date()
        , updatedAt: new Date()
      };

      request.post({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs'}, function (err, res, obj) {
        res.statusCode.should.equal(204);
        Tldr.find({url: 'http://needforair.com/nutcrackers'}, function(err, docs) {
          var tldr = docs[0];
          tldr.summaryBullets.should.include('Best Blog Ever');
          tldr.title.should.equal('Nutcrackers article');

          done();
        });
      });
    });

    it('Shouldn\'t create a new tldr with POST if there is no url provided', function (done) {
      var tldrData = { summaryBullets: ['summary'] };   // Summary can't be empty

      request.post({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs'}, function (err, res, obj) {
          res.statusCode.should.equal(403);
          obj.should.have.property('url');
          Tldr.find({}, function(err, docs) {
            docs.length.should.equal(numberOfTldrs);

            done();
          });
        });
    });

    it('Shouldn\'t create a new tldr with POST if there are validation errors', function (done) {
      var tldrData = { url: 'http://nfa.com' 
        , summaryBullets: [''] };   // Summary can't be empty

      request.post({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs'}, function (err, res, obj) {
          obj.should.have.property('summaryBullets');
          res.statusCode.should.equal(403);
          Tldr.find({}, function(err, docs) {
            docs.length.should.equal(numberOfTldrs);

            done();
          });
        });
    });


  });


  //Test PUT Requests
  describe('Should handle PUT requests', function () {

    it('Should update an existing tldr with PUT motherfucker', function (done) {
      var tldrData = { summaryBullets: ['A new summary'] };

      request.put({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs/111111111111111111111111'}, function (err, res, obj) {
        res.statusCode.should.equal(204);
        Tldr.find({}, function(err, docs) {
          var tldr;
          docs.length.should.equal(numberOfTldrs);

          Tldr.find({url: 'http://avc.com/mba-monday'}, function(err, docs) {
            tldr = docs[0];
            tldr.summaryBullets.should.include('A new summary');

            done();
          });
        });
      });
    });

    it('Should handle bad PUT request', function (done) {
      var tldrData = { summaryBullets: ['A new summary'] };

      request.put({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs/thisisnotanobjectid'}, function (err, res, obj) {
        res.statusCode.should.equal(403);
        done();
      });
    });

    it('Should handle PUT request with non existent', function (done) {

      var tldrData = { summaryBullets: ['A new summary'] };
      request.put({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs/222222222222222222222222'}, function (err, res, obj) {
        res.statusCode.should.equal(404);
        done();
      });
    });

 


    it('Should not update an existing tldr with PUT if there are validation errors', function (done) {
      var tldrData = { summaryBullets: [''] };

      request.put({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs/111111111111111111111111'}, function (err, res, obj) {
        obj.should.have.property('summaryBullets');
        res.statusCode.should.equal(403);
        Tldr.find({}, function(err, docs) {
          var tldr;
          docs.length.should.equal(numberOfTldrs);

          Tldr.find({url: 'http://avc.com/mba-monday'}, function(err, docs) {
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

      request.post({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs'}, function (err, res, obj) {
        res.statusCode.should.equal(201);

        request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?url=' + encodeURIComponent('http://yetanotherunusedurl.com/yomama#ewrwerwr')}, function (err, res, obj) {
          res.statusCode.should.equal(200);

          done();
        });
      });
    });

    it('should be able to update the logged user\'s info', function (done) {
      var obj;

      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

        response.statusCode.should.equal(200);
        body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request

        request.put({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/you'
                     , json: { email: "bloup@nfa.com"
                             , currentPassword: "supersecret"
                             , newPassword: "agoodone"
                             , username: "yepyep" } }, function (error, response, body) {

          request.get({ headers: {"Accept": "application/json"}
                      , uri: rootUrl + '/users/you' }, function (error, response, body) {

            response.statusCode.should.equal(200);
            obj = JSON.parse(body);
            obj.email.should.equal("user1@nfa.com");   // Email is not modifiable
            obj.username.should.equal("yepyep");

            request.get({ headers: {"Accept": "application/json"}
                        , uri: rootUrl + '/users/logout' }, function (error, response, body) {

              response.statusCode.should.equal(200);
              request.post({ headers: {"Accept": "application/json"}
                           , uri: rootUrl + '/users/login'
                           , json: { email: "user1@nfa.com", password: "agoodone" } }, function (error, response, body) {

                response.statusCode.should.equal(200);
                body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request

                request.get({ headers: {"Accept": "application/json"}
                            , uri: rootUrl + '/users/logout' }, function (error, response, body) {
                  done();
                });
              });
            });
           });
         });
      });
    });

    it('should NOT be able to update the logged user\'s info if there are validation errors, and send back the errors', function (done) {
      var obj;

      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

        response.statusCode.should.equal(200);
        body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request

        request.put({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/you'
                     , json: { email: "bloup@nfa.com"
                             , currentPassword: "supersecretNOPE"
                             , newPassword: "abad"
                             , username: "" } }, function (error, response, body) {

          response.statusCode.should.equal(403);
          assert.isDefined(body.username);
          assert.isDefined(body.currentPassword);
          assert.isDefined(body.newPassword);

            request.get({ headers: {"Accept": "application/json"}
                        , uri: rootUrl + '/users/logout' }, function (error, response, body) {

              response.statusCode.should.equal(200);
              request.post({ headers: {"Accept": "application/json"}
                           , uri: rootUrl + '/users/login'
                           , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

                response.statusCode.should.equal(200);
                body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request
                body.username.should.equal("User One");

                request.get({ headers: {"Accept": "application/json"}
                            , uri: rootUrl + '/users/logout' }, function (error, response, body) {
                  done();
                });
              });
           });
         });
      });
    });


  });


  describe('Test authentication and session', function() {

    it('Should not be able to log in as User One with a wrong password', function (done) {
      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "user1@nfa.com", password: "superse" } }, function (error, response, body) {
        response.statusCode.should.equal(401);
        response.headers['www-authenticate'].should.equal('InvalidPassword');
        done();
      });
    });

    it('Should not be able to log in with a wrong username', function (done) {
      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "anotheruser@nfa.com", password: "superse" } }, function (error, response, body) {
        response.statusCode.should.equal(401);
        response.headers['www-authenticate'].should.equal('UnknownUser');
        done();
      });
    });

    it('Should not be able to log in with a missing part of the credentials', function (done) {
      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "anotheruser@nfa.com" } }, function (error, response, body) {
        //Passport doesnt set www-authenticate when missing credentials
        // but just send error 401
        response.statusCode.should.equal(401);

        request.post({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/login'
                     , json: { password: "anothe" } }, function (error, response, body) {
          response.statusCode.should.equal(401);

          request.post({ headers: {"Accept": "application/json"}
                       , uri: rootUrl + '/users/login'
                       , json: {} }, function (error, response, body) {
            response.statusCode.should.equal(401);

            done();
          });
        });
      });
    });

    // Test scenario: check who's logged (should be nobody), log in, check who's logged (user1), logout (should get a 200 logout ok),
    // test who's logged in (nobody), logout (should get a 400 nobody was logged in)
    it('Should be able to log in with a right username and password and only send the session usable data', function (done) {
      var obj;

      request.get({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/you' }, function (error, response, body) {

        response.statusCode.should.equal(401);
        response.headers['www-authenticate'].should.equal('UnknownUser');
        obj = JSON.parse(body);
        assert.isDefined(obj.message);
        assert.isUndefined(obj.email);

        request.post({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/login'
                     , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

          response.statusCode.should.equal(200);
          body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request
          assert.isUndefined(body.password);
          assert.isUndefined(body._id);

          request.get({ headers: {"Accept": "application/json"}
                      , uri: rootUrl + '/users/you' }, function (error, response, body) {

            response.statusCode.should.equal(200);
            obj = JSON.parse(body);
            obj.email.should.equal("user1@nfa.com");
            assert.isUndefined(obj.password);
            assert.isUndefined(obj._id);

            request.get({ headers: {"Accept": "application/json"}
                        , uri: rootUrl + '/users/logout' }, function (error, response, body) {

              response.statusCode.should.equal(200);

              request.get({ headers: {"Accept": "application/json"}
                           , uri: rootUrl + '/users/you' }, function (error, response, body) {

                response.statusCode.should.equal(401);
                response.headers['www-authenticate'].should.equal('UnknownUser');
                obj = JSON.parse(body);
                assert.isDefined(obj.message);
                assert.isUndefined(obj.email);

                request.get({ headers: {"Accept": "application/json"}
                            , uri: rootUrl + '/users/logout' }, function (error, response, body) {

                  response.statusCode.should.equal(400);

                  done();
                });
              });
            });
          });
        });
      });
    });


    it('should be able to attribute a tldr when the creator is logged and get all tldrs created by the logged user', function (done) {
      var tldrData1 = { url: 'http://myfile.com/movie',
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
                     }
        , tldrData3 = { url: 'http://another.com/again',
                       title: 'Blog NFA',
                       summaryBullets: ['Awesdsaasd', 'Another bullet'],
                       resourceAuthor: 'NFA Crew',
                       resourceDate: '2012',
                       createdAt: new Date(),
                       updatedAt: new Date()
                     }
        , obj;

      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/tldrs'
                   , json: tldrData1 }, function (error, response, body) {

        Tldr.findOne({url: 'http://myfile.com/movie'}, function(err, tldr) {
          assert.isUndefined(tldr.creator);   // No user was logged in, so this tldr has no creator

          request.post({ headers: {"Accept": "application/json"}
                       , uri: rootUrl + '/users/login'
                       , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

            body.email.should.equal("user1@nfa.com");   // Login successful as User 1
            request.post({ headers: {"Accept": "application/json"}
                         , uri: rootUrl + '/tldrs'
                         , json: tldrData2 }, function (error, response, body) {

              Tldr.findOne({url: 'http://another.com/movie'}, function(err, tldr) {
                tldr.creator.toString().length.should.equal(24);   // Should be an ObjectId, hence length of 24
                request.post({ headers: {"Accept": "application/json"}
                             , uri: rootUrl + '/tldrs'
                             , json: tldrData3 }, function (error, response, body) {

                  request.get({ headers: {"Accept": "application/json"}
                               , uri: rootUrl + '/users/you/createdtldrs' }, function (error, response, body) {

                    obj = JSON.parse(body);
                    obj[0].url.should.equal("http://another.com/movie");
                    obj[1].url.should.equal("http://another.com/again");

                    request.get({ headers: {"Accept": "application/json"}
                                , uri: rootUrl + '/users/logout' }, function (error, response, body) {

                      // Logout in case we have other tests after this one
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

    it('should be able to create a new user and send to the client the authorized fields. The newly created user should be logged in', function (done) {
      var userNumber, obj;

      User.find({}, function(err, users) {
        userNumber = users.length;
        request.post({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users'
                     , json: {username: "Louiiis", email: "valid@email.com", password: "supersecret"} }, function (error, response, body) {

          // Only the data we want to send is sent
          body.email.should.equal("valid@email.com");
          body.username.should.equal("Louiiis");
          assert.isUndefined(body._id);
          assert.isUndefined(body.password);

          User.find({}, function (err, users) {
            users.length.should.equal(userNumber + 1);   // The user really is created

            request.get({ headers: {"Accept": "application/json"}
                         , uri: rootUrl + '/users/you' }, function (error, response, body) {

              obj = JSON.parse(body);
              obj.email.should.equal("valid@email.com");

              done();
            });
          });
        });
      });
    });

    it('should validate user email with the corresponding routes and valid validation code', function (done) {

      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

         response.statusCode.should.equal(200);
         body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request
         body.validationStatus.should.equal('waitingForVerification');

         request.get({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/validate?' }, function (error, response, body) {

           // Should return 400 if code is the provided as parameter
           response.statusCode.should.equal(400);
           request.get({ headers: {"Accept": "application/json"}
                       , uri: rootUrl + '/users/validate?code=badvalidationcode' }, function (error, response, body) {

             response.statusCode.should.equal(404);
             User.findOne({ email: "user1@nfa.com" }, function (err, doc) {

               // Retrieve validation Code by directly queryin the db
               var validationCode = doc.validationCode;
               doc.validationStatus.should.equal('waitingForVerification');

               request.get({ headers: {"Accept": "application/json"}
                           , uri: rootUrl + '/users/validate?code=' + encodeURIComponent(validationCode) }, function (error, response, body) {

                 response.statusCode.should.equal(200);
                 User.findOne({ email: "user1@nfa.com" }, function (err, doc) {
                   doc.validationStatus.should.equal('emailVerified');
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

