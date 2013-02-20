/**
 * Server Tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , app = require('../server')
  , models = require('../lib/models')
  , db = app.db
  , mongoose = require('mongoose')
  , async = require('async')
  , Tldr = models.Tldr
  , Credentials = models.Credentials
  , User = models.User
  , rootUrl = 'http://localhost:8686'
  , bcrypt = require('bcrypt')
  , request = require('request')
  , customUtils = require('../lib/customUtils')
  , Topic = models.Topic

  // Global variables used throughout the tests
  , tldr1, tldr2, tldr3, tldr4, numberOfTldrs
  , user1
  , topic1
  , client;


// Usable by async to log a user in or out
function logUserIn(email, password, cb) {
  request.post({ headers: {"Accept": "application/json"}
               , uri: rootUrl + '/users/login'
               , json: { email: email, password: password } }
    , function (error, response, body) {
        response.statusCode.should.equal(200);   // If we couldnt log in the test will fail
        cb(error);
      });
}

function logUserOut(cb) {
  request.get({ headers: {"Accept": "application/json"}
              , uri: rootUrl + '/users/logout' }, function (error, response, body) { cb(error); });
}

// Check for existence of tldr. Usable by async
function tldrShouldExist(id, cb) { Tldr.find({ _id: id }, function(err, docs) { cb(docs.length === 0 ? {} : null); }); }
function tldrShouldNotExist(id, cb) { Tldr.find({ _id: id }, function(err, docs) { cb(docs.length === 0 ? null : {}); }); }

// Version of setTimeout usable with async.apply
// Used to integration test parts using the message queue
function wait (millis, cb) {
  setTimeout(cb, millis);
}


/**
 * Tests
*/

describe('Webserver', function () {

  // The done arg is very important ! If absent tests run synchronously
  // that means there is n chance you receive a response to your request
  // before mocha quits

  before(function (done) {
    app.launchServer(done);
  });

  after(function (done) {
    app.stopServer(done);
  });

  // Synchronously saves an array of tldrs to the database. Used for tests that need a lot of tldrs in the database (getTldrsWithQuery for example)
  function saveSync(arr, idx, done, callback) {
    if (idx === arr.length) {
      return callback();
    }

    arr[idx].save(function(err) {
      if (err) {return done(err);}
      saveSync(arr, idx + 1, done, callback);
    });
  }

  beforeEach(function (done) {

    // dummy models
    var tldrData1 = {url: 'http://needforair.com/nutcrackers', title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , tldrData2 = {url: 'http://avc.com/mba-monday', title:'mba-monday', summaryBullets: ['Fred Wilson is my God'], resourceAuthor: 'Fred', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , tldrData3 = {url: 'http://bothsidesofthetable.com/deflationnary-economics', title: 'deflationary economics', summaryBullets: ['Sustering is my religion'], resourceAuthor: 'Mark', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , tldrData4 = {url: 'http://needforair.com/sopa', title: 'sopa', summaryBullets: ['Great article'], resourceAuthor: 'Louis', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , userData1 = {email: "user1@nfa.com", username: "UserOne", password: "supersecret", twitterHandle: 'blipblop'}
      , adminData1 = { email: "louis.chatriot@gmail.com", username: "louis", password: "supersecret" }
      , topicData1 = { title: 'et voila un topic' }
      ;

    function theRemove(collection, cb) { collection.remove({}, function(err) { cb(err); }); }   // Remove everything from collection

    async.waterfall([
      async.apply(theRemove, Credentials)
    , async.apply(theRemove, User)
    , async.apply(theRemove, Tldr)
    , async.apply(theRemove, Topic)
    ], function(err) {
         User.createAndSaveInstance(userData1, function (err, user) {
           user1 = user;

           // Create the four tldrs. Their creator is user1
           async.waterfall([
             function(cb) { Tldr.createAndSaveInstance(tldrData1, user1, function(err, tldr) { tldr1 = tldr; cb(); }); }
           , function(cb) { Tldr.createAndSaveInstance(tldrData2, user1, function(err, tldr) { tldr2 = tldr; cb(); }); }
           , function(cb) { Tldr.createAndSaveInstance(tldrData3, user1, function(err, tldr) { tldr3 = tldr; cb(); }); }
           , function(cb) { Tldr.createAndSaveInstance(tldrData4, user1, function(err, tldr) { tldr4 = tldr; cb(); }); }
           , function(cb) { User.createAndSaveInstance(adminData1, function() { cb(); }); }
           , function(cb) { Topic.createAndSaveInstance(topicData1, user1, function(err, _topic) { topic1 = _topic; cb(); }); }
           ], function() { Tldr.find({}, function(err, docs) { numberOfTldrs = docs.length; done(); }); });   // Finish by saving the number of tldrs
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
  describe('GET tldrs', function () {

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
        obj.message.should.equal(i18n.resourceNotFound);
        done();
      });

    });

    it('an existing tldr given an _id with /tldrs/:id', function (done) {
      request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/' + tldr2._id}, function (err, res, body) {
        var obj = JSON.parse(res.body);
        res.statusCode.should.equal(200);
        obj.url.should.equal('http://avc.com/mba-monday');
        assert.isUndefined(obj.history.versions);
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

    it('Get latest tldrs', function (done) {
      var someTldrs = []
        , someFunctions = []
        , i, temp, now = new Date()
        , defaultLimit = 10
        , older, obj;

      // Here we cant use createAndSaveInstance because we want to be able to set createdAt and updatedAt which is not permitted by this function
      for (i = 0; i <= 25; i += 1) {
        temp = new Date(now - 10000 * (i + 1));
        someTldrs.push(new Tldr({ url: 'http://needforair.com/sopa/number' + i
                                , possibleUrls: ['http://needforair.com/sopa/number' + i]
                                , originalUrl: 'http://needforair.com/sopa/number' + i
                                , hostname: 'needforair.com'
                                , title: 'sopa'
                                , slug: 'sopa-' + i
                                , summaryBullets: ['Great article']
                                , resourceAuthor: 'Louis'
                                , resourceDate: new Date()
                                , creator: user1._id
                                , history: '111111111111111111111111'   // Dummy _id, the history is not used by this test
                                , createdAt: new Date()
                                , updatedAt: temp  }));
      }

      older = new Date(now - 10000 * (12));

      saveSync(someTldrs, 0, done, function() {
        Tldr.find({}, function(err,docs) {
          docs.length.should.equal(30);

          // Tests that giving a negative limit value only gives up to defaultLimit (here 10) tldrs AND that they are the 10 most recent
          request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/latest/-1'}, function (err, res, body) {
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
            request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/latest/0'}, function (err, res, body) {
              obj = JSON.parse(res.body);
              obj.length.should.equal(defaultLimit);

              // A limit greater than defaultLimit should give defaultLimit objects as well
              request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/latest/11'}, function (err, res, body) {
                obj = JSON.parse(res.body);
                obj.length.should.equal(defaultLimit);

                // Forgetting the limit should force the handler to return defaultLimit objects
                request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/latest'}, function (err, res, body) {
                  obj = JSON.parse(res.body);
                  obj.length.should.equal(defaultLimit);

                  // Using it normally it should work! And return the 5 latest tldrs
                  request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/latest/5'}, function (err, res, body) {
                    obj = JSON.parse(res.body);
                    obj.length.should.equal(5);
                    temp = _.map(obj, function (o) { return o. url; });
                    _.indexOf(temp, 'http://bothsidesofthetable.com/deflationnary-economics').should.not.equal(-1);
                    _.indexOf(temp, 'http://avc.com/mba-monday').should.not.equal(-1);
                    _.indexOf(temp, 'http://needforair.com/nutcrackers').should.not.equal(-1);
                    _.indexOf(temp, 'http://needforair.com/sopa').should.not.equal(-1);
                    _.indexOf(temp, 'http://needforair.com/sopa/number0').should.not.equal(-1);

                    // Calling with a non-numeral value for limit should make it return defaultLimit tldrs
                    request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/latest/asd'}, function (err, res, body) {
                      obj = JSON.parse(res.body);
                      obj.length.should.equal(defaultLimit);

                      // Called with a non-numeral value for startat, it should use 0 as a default value
                      request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/latest/4?startat=rew'}, function (err, res, body) {
                        obj = JSON.parse(res.body);
                        obj.length.should.equal(4);
                        temp = _.map(obj, function (o) { return o. url; });
                        _.indexOf(temp, 'http://bothsidesofthetable.com/deflationnary-economics').should.not.equal(-1);
                        _.indexOf(temp, 'http://avc.com/mba-monday').should.not.equal(-1);
                        _.indexOf(temp, 'http://needforair.com/nutcrackers').should.not.equal(-1);
                        _.indexOf(temp, 'http://needforair.com/sopa').should.not.equal(-1);

                        // With normal values for startat and limit, it should behave normally
                        request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/latest/4?startat=5'}, function (err, res, body) {
                          obj = JSON.parse(res.body);
                          obj.length.should.equal(4);
                          temp = _.map(obj, function (o) { return o. url; });
                          _.indexOf(temp, 'http://needforair.com/sopa/number1').should.not.equal(-1);
                          _.indexOf(temp, 'http://needforair.com/sopa/number2').should.not.equal(-1);
                          _.indexOf(temp, 'http://needforair.com/sopa/number3').should.not.equal(-1);
                          _.indexOf(temp, 'http://needforair.com/sopa/number4').should.not.equal(-1);

                          // If startat is too high, no tldr is sent
                          request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/latest/4?startat=55'}, function (err, res, body) {
                            obj = JSON.parse(res.body);
                            obj.length.should.equal(0);

                            // Shouldn't return tldrs that are not in the 'latestTldrs' distribution channel
                            Tldr.update({ url: 'http://needforair.com/sopa/number1' }, { $set: { 'distributionChannels.latestTldrs': false } }, { multi: false }, function (err, n) {
                              request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/latest/7'}, function (err, res, body) {
                                obj = JSON.parse(res.body);
                                obj.length.should.equal(7);
                                temp = _.map(obj, function (o) { return o. url; });
                                _.indexOf(temp, 'http://bothsidesofthetable.com/deflationnary-economics').should.not.equal(-1);
                                _.indexOf(temp, 'http://avc.com/mba-monday').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/nutcrackers').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/sopa').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/sopa/number0').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/sopa/number2').should.not.equal(-1);
                                _.indexOf(temp, 'http://needforair.com/sopa/number3').should.not.equal(-1);

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

    // This test will contain all we need to test this function as it takes some time to prepare the database every time
    it('Search tldrs with custom query', function (done) {
      var obj;

      request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?url=' + encodeURIComponent('http://idontexist.com/nope') }, function (err, res, body) {
        res.statusCode.should.equal(404);

        request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/tldrs/search?url=' + encodeURIComponent('http://bothsidesofthetable.com/deflationnary-economics') }, function (err, res, body) {
          res.statusCode.should.equal(200);
          obj = JSON.parse(res.body);
          obj.url.should.equal('http://bothsidesofthetable.com/deflationnary-economics');
          obj._id.toString().should.equal(tldr3._id.toString());
          done();
        });
      });
    });

    it('Should be able to Search tldrs by batch and return the docs with the necessary info populated', function (done) {
      var someTldrs = []
        , i
        , temp
        , batch
        , batchTooLarge = []
        , now = new Date();

      // Create a batch with 51 urls
      for (i = 0; i < 51; i += 1) {
        batchTooLarge.push('http://baaad.com/' + i);
      }

      // Here we cant use createAndSaveInstance because we want to be able to set createdAt and updatedAt which is not permitted by this function
      for (i = 0; i <= 10; i += 1) {
        temp = new Date(now - 10000 * (i + 1));
        someTldrs.push({ url: 'http://needforair.com/sopa/number' + i
                       , title: 'sopa'
                       , summaryBullets: ['Great article']
                       });
      }

      function saveTldr(data, creator, cb) {
        Tldr.createAndSaveInstance(data, creator, function () {
          cb();
        });
      }
      async.waterfall([
         async.apply(saveTldr,someTldrs[0] ,user1)
       , async.apply(saveTldr,someTldrs[1] ,user1)
       , async.apply(saveTldr,someTldrs[2] ,user1)
       , async.apply(saveTldr,someTldrs[3] ,user1)
       , async.apply(saveTldr,someTldrs[4] ,user1)
       , async.apply(saveTldr,someTldrs[5] ,user1)
       , async.apply(saveTldr,someTldrs[6] ,user1)
       , async.apply(saveTldr,someTldrs[7] ,user1)
       , async.apply(saveTldr,someTldrs[8] ,user1)
       , async.apply(saveTldr,someTldrs[9] ,user1)
       , function (cb) {
        batch = ['http://needforair.com/sopa/number0?toto=ata', 'http://needforair.com/sopa/number5','http://needforair.com/sopa/number9', 'http://toto.com/resourcedoesntexist#test' ];
        // Should return empty array if request is not well formed
        request.post({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/tldrs/searchBatch'
                     , json: { badObject: batch } } , function (err, res, body) {

          body.tldrs.length.should.be.equal(0);

          // Try with a batch thats too large
          request.post({ headers: {"Accept": "application/json"}
                       , uri: rootUrl + '/tldrs/searchBatch'
                       , json: { batch: batchTooLarge } } , function (err, res, body) {

            res.statusCode.should.equal(403);
            body.message.should.equal(i18n.batchTooLarge);
            assert.isUndefined(body.tldrs);

            // Request should return existing tldrs in the batch array
            request.post({ headers: {"Accept": "application/json"}
                         , uri: rootUrl + '/tldrs/searchBatch'
                         , json: { batch: batch } } , function (err, res, body) {

              var tldrs = body.tldrs
                , urls = body.urls
                , tldrizedUrls = _.pluck(tldrs, 'url');

              tldrizedUrls.length.should.equal(3);
              tldrizedUrls.should.contain('http://needforair.com/sopa/number0');
              tldrizedUrls.should.not.contain('http://toto.com/resourcedoesntexist');
              tldrs[0].creator.username.should.equal('UserOne');
              assert.isUndefined(tldrs[0].creator.password);

              urls['http://needforair.com/sopa/number0?toto=ata'].should.equal('http://needforair.com/sopa/number0');
              done();
            });
          });
        });
         }
       ], done);

    });

    // No need to use wait here, requests seems to be much slower than Redis anyway
    it('Should redirect to correct tldr-page "slug url" if queried with the wrong one or the former url type', function (done) {
      var previousReadCount;

      Tldr.findOne({ _id: tldr2._id }, function (err, _tldr) {
        previousReadCount = _tldr.readCount;

        request.get( { headers: {"Accept": "text/html"}
                     , uri: rootUrl + '/tldrs/' + tldr2._id + '/some-bad-slug'
                     , followRedirect: false }
                   , function (err, res, body) {
          res.statusCode.should.equal(301);
          res.headers['content-type'].should.contain('text/html');
          res.headers.location.should.match(new RegExp('/tldrs/' + tldr2._id + '/' + tldr2.slug + '$'));

          Tldr.findOne({ _id: tldr2._id }, function (err, _tldr) {
            _tldr.readCount.should.equal(previousReadCount + 1);   // OK, double counting

          request.get( { headers: {"Accept": "text/html"}
                       , uri: rootUrl + '/tldrs/' + tldr2._id
                       , followRedirect: false }
                     , function (err, res, body) {
              res.statusCode.should.equal(301);
              res.headers.location.should.match(new RegExp('/tldrs/' + tldr2._id + '/' + tldr2.slug + '$'));

              Tldr.findOne({ _id: tldr2._id }, function (err, _tldr) {
                _tldr.readCount.should.equal(previousReadCount + 2);   // OK, double counting

                done();
              });
            });
          });
        });
      });
    });

    it('Should serve 404 if a non existing tldr-page was requested', function (done) {
      request.get({ headers: {"Accept": "text/html"}, uri: rootUrl + '/tldrs/bloup/50af46f20bc6851111111111' }, function (err, res, body) {
        res.statusCode.should.equal(404);
        done();
      });
    });

  });   // ==== End of 'GET tldrs' ==== //


  describe('DELETE tldrs - through the use of GET', function() {
    function deleteTldr(id, expectedCode, cb) {
      request.get({ uri: rootUrl + '/tldrs/' + id + '/delete'}, function (err, res, body) {
        res.statusCode.should.equal(expectedCode);
        cb();
      });
    }

    it('Should delete a tldr only if the logged in user is an admin', function (done) {
      async.waterfall([
        async.apply(logUserOut)
      , async.apply(deleteTldr, tldr2._id, 401)
      , async.apply(tldrShouldExist, tldr2._id)
      , async.apply(logUserIn, 'user1@nfa.com', 'supersecret')
      , async.apply(deleteTldr, tldr2._id, 401)
      , async.apply(tldrShouldExist, tldr2._id)
      , async.apply(logUserOut)
      , async.apply(logUserIn, 'louis.chatriot@gmail.com', 'supersecret')
      , async.apply(deleteTldr, tldr2._id, 200)
      , async.apply(tldrShouldNotExist, tldr2._id)
      , function (cb) {
          Tldr.find({}, function (err, docs) {
            docs.length.should.equal(numberOfTldrs - 1);
            cb();
          });
        }
      ], done);
    });

    it('Should not delete anything if given a wrong id to delete', function (done) {
      async.waterfall([
        async.apply(logUserIn, 'louis.chatriot@gmail.com', 'supersecret')
      , async.apply(deleteTldr, '111111111100000000001100', 200)   // Try to delete an inexistant tldr. Code is 200 as always for the deletion function
      , function (cb) {
          Tldr.find({}, function (err, docs) {
            docs.length.should.equal(numberOfTldrs);   // But the check on the number of tldrs confirms the deletion took place
            cb();
          });
        }
      ], done);
    });

  });   // ==== End of 'DELETE tldrs - through the use of GET' ==== //



  //Test POST Requests
  describe('POST tldrs ', function () {

    describe('If no user is logged', function () {
      it('Should not be able to create an existing tldr with POST', function (done) {
        var tldrData = {
          title: 'A title',
          url: 'http://yetanotherunusedurl.com/somepage',
          summaryBullets: ['A summary'],
          resourceAuthor: 'bozo le clown',
        };

        request.post({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs'}, function (err, res, obj) {
          res.statusCode.should.equal(401);
          done();
        });
      });
    });


    describe('Restricted to logged users', function () {
      beforeEach(function(done) {
        logUserIn('user1@nfa.com', 'supersecret', done);
      });

      afterEach(function(done) {
        logUserOut(done);
      });

      it('Should create a new tldr with POST if it doesn\'t exist yet, and return it', function (done) {
        var tldrData = {
          title: 'A title',
          url: 'http://yetanotherunusedurl.com/somepage',
          summaryBullets: ['A summary'],
          resourceAuthor: 'bozo le clown',
        };

        request.post({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs'}, function (err, res, obj) {
          res.statusCode.should.equal(201);
          obj.title.should.equal('A title');
          obj.createdAt.should.not.be.null;
          obj.creator.username.should.equal('UserOne');
          obj.creator.twitterHandle.should.equal('blipblop');

          Tldr.find({}, function(err, docs) {
            var tldr;
            docs.length.should.equal(numberOfTldrs + 1);

            Tldr.find({possibleUrls: 'http://yetanotherunusedurl.com/somepage'}, function(err, docs) {
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
          Tldr.find({possibleUrls: 'http://needforair.com/nutcrackers'}, function(err, docs) {
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
  });   // ==== End of 'POST tldrs' ==== //


  describe('PUT tldrs ', function () {

    describe('If no user is logged', function () {
      it('Should not be able to update an existing tldr with PUT', function (done) {
        var tldrData = { summaryBullets: ['A new summary'] };

        request.put({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs/' + tldr2._id}, function (err, res, obj) {
          res.statusCode.should.equal(401);
          done();
        });
      });

      it('Should not be able to thank the contributor for a tldr', function (done) {

        request.put({  uri: rootUrl + '/tldrs/'+ tldr2._id + '/thank' }, function (err, res, obj) {
          res.statusCode.should.equal(401);
          Tldr.findOne({ _id: tldr2._id}, function (err, tldr) {
            tldr.thankedBy.length.should.equal(0);
            done();
          });
        });
      });

      it('Should  be able to increment the read count with /tldrs/:id', function (done) {
        var tldrData = { incrementReadCount: true }
          , prevReadCount;

        Tldr.findOne({ _id: tldr2._id}, function (err, tldr) {
          prevReadCount = tldr.readCount;
          request.put({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs/' + tldr2._id}, function (err, res, obj) {
            res.statusCode.should.equal(204);

            Tldr.findOne({ _id: tldr2._id}, function (err, tldr) {
              tldr.readCount.should.equal(prevReadCount+ 1);
              done();
            });
          });
        });
      });
    });
 

    describe('Restricted to logged users', function () {
      beforeEach(function(done) {
        logUserIn('user1@nfa.com', 'supersecret', done);
      });

      afterEach(function(done) {
        logUserOut(done);
      });

      it('Should update an existing tldr with PUT motherfucker', function (done) {
        var tldrData = { summaryBullets: ['A new summary'] };

        request.put({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs/' + tldr2._id}, function (err, res, obj) {
          res.statusCode.should.equal(204);
          Tldr.find({}, function(err, docs) {
            var tldr;
            docs.length.should.equal(numberOfTldrs);

            Tldr.find({possibleUrls: 'http://avc.com/mba-monday'}, function(err, docs) {
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

      it('Should handle PUT request with non existent _id', function (done) {

        var tldrData = { summaryBullets: ['A new summary'] };
        request.put({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs/222222222222222222222222'}, function (err, res, obj) {
          res.statusCode.should.equal(404);
          done();
        });
      });

      it('Should not update an existing tldr with PUT if there are validation errors', function (done) {
        var tldrData = { summaryBullets: [''] };

        request.put({ headers: {"Accept": "application/json"}, json: tldrData, uri: rootUrl + '/tldrs/' + tldr2._id}, function (err, res, obj) {
          obj.should.have.property('summaryBullets');
          res.statusCode.should.equal(403);
          Tldr.find({}, function(err, docs) {
            var tldr;
            docs.length.should.equal(numberOfTldrs);

            Tldr.find({possibleUrls: 'http://avc.com/mba-monday'}, function(err, docs) {
              tldr = docs[0];
              tldr.summaryBullets.should.include('Fred Wilson is my God');

              done();
            });
          });
        });
      });

      it('Should be able to thank the contributor of a tldr', function (done) {
        Tldr.findOne({ _id: tldr2._id}, function (err, tldr) {
          tldr.thankedBy.should.not.include(user1._id.toString());
          request.put( {uri: rootUrl + '/tldrs/' + tldr2._id +'/thank'}, function (err, res, obj) {
            var tldr = JSON.parse(obj);
            res.statusCode.should.equal(200);
            tldr.thankedBy.should.include(user1._id.toString());
            done();
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
    });

  });   // ==== End of 'PUT tldrs' ==== //

  describe('GET users', function () {

    it('admins should be able to access any user\'s data', function (done) {
      var obj;

      async.waterfall([
        async.apply(logUserIn, 'user1@nfa.com', 'supersecret')
      , function (cb) {
          request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/' + user1.username }, function (err, res, body) {
            res.statusCode.should.equal(200);
            body.should.not.contain('only-admin-infos');
            cb();
          });
        }
      , async.apply(logUserIn, 'louis.chatriot@gmail.com', 'supersecret')
      , function (cb) {
          request.get({ headers: {"Accept": "application/json"}, uri: rootUrl + '/' + user1.username }, function (err, res, body) {
            res.statusCode.should.equal(200);
            body.should.contain('only-admin-infos');

            cb();
          });
        }
      ], done);
    });


  });   // ==== End of 'GET users' ==== //


  describe('PUT users', function() {

    it('should be able to update the logged user\'s profile', function (done) {
      var obj;

      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

        response.statusCode.should.equal(200);
        body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request

        request.put({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/you'
                     , json: { username: "yepyep"
                             , email: 'yadoo@bl.com'
                             , twitterHandle: "@fuckyeah"
                             , bio: "yipee yop" } }, function (error, response, body) {

          request.get({ headers: {"Accept": "application/json"}
                      , uri: rootUrl + '/users/you' }, function (error, response, body) {

            response.statusCode.should.equal(200);
            obj = JSON.parse(body);
            obj.email.should.equal("yadoo@bl.com");
            obj.username.should.equal("yepyep");
            obj.bio.should.equal("yipee yop");
            obj.twitterHandle.should.equal("fuckyeah");   // Leading @ was automatically removed

            done();
           });
         });
      });
    });

    it('should not do anything on update user info if input fields are empty', function (done) {
      var obj;
      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

        response.statusCode.should.equal(200);
        body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request

        request.put({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/you'
                     , json: { } }, function (error, response, body) {

          response.statusCode.should.equal(200);
          request.get({ headers: {"Accept": "application/json"}
                      , uri: rootUrl + '/users/you' }, function (error, response, body) {

            response.statusCode.should.equal(200);
            obj = JSON.parse(body);
            obj.username.should.equal(user1.username);

            done();
           });
         });
      });
    });

    it('should be able to update the logged user\'s password only if new password and confirmation match', function (done) {
      var obj;

      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

        response.statusCode.should.equal(200);
        body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request

        request.put({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/you/updatePassword'
                     , json: { oldPassword: "supersecret"
                             , newPassword: "fantomas"
                             , confirmPassword: "fantomasBAD" } }, function (error, response, body) {

            response.statusCode.should.equal(403);
            body.confirmPassword.should.equal(i18n.passwordNoMatch);

            request.put({ headers: {"Accept": "application/json"}
                         , uri: rootUrl + '/users/you/updatePassword'
                         , json: { oldPassword: "supersecret"
                                 , newPassword: "fantomas"
                                 , confirmPassword: "fantomas" } }, function (error, response, body) {
                request.get({ headers: {"Accept": "application/json"}
                            , uri: rootUrl + '/users/logout' }, function (error, response, body) {

                  response.statusCode.should.equal(200);
                  request.post({ headers: {"Accept": "application/json"}
                               , uri: rootUrl + '/users/login'
                               , json: { email: "user1@nfa.com", password: "fantomas" } }, function (error, response, body) {

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

      User.createAndSaveInstance({ username: "blip"
                                 , email: "another@nfa.com"
                                 , password: "supersecret" }, function(err) {
      assert.isNull(err);

      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

        response.statusCode.should.equal(200);
        body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request

        request.put({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/you'
                     , json: { password: "abad"
                             , twitterHandle: 'BjashkgfshdfgjhasgfdadhgfAD'
                             , username: "to" } }, function (error, response, body) { // THis will just update profile

          response.statusCode.should.equal(403);
          assert.isDefined(body.username);
          assert.isDefined(body.twitterHandle);

        request.put({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/you'
                     , json: { username: "blip" } }, function (error, response, body) {

            response.statusCode.should.equal(409);
            body.duplicateField.should.equal("usernameLowerCased");

        request.put({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/you/updatePassword'
                     , json: { oldPassword: "sUPERseCRet"
                             , newPassword: "fantomas"
                             , confirmPassword: "fantomas" }}, function (error, response, body) {

            response.statusCode.should.equal(403);
            assert.isDefined(body.oldPassword);

            request.put({ headers: {"Accept": "application/json"}
                         , uri: rootUrl + '/users/you/updatePassword'
                         , json: { oldPassword: "supersecret"
                                 , newPassword: "fantomas"
                                 , confirmPassword: "fanToMas" }}, function (error, response, body) {

                response.statusCode.should.equal(403);
                body.confirmPassword.should.equal(i18n.passwordNoMatch);

                request.get({ headers: {"Accept": "application/json"}
                            , uri: rootUrl + '/users/logout' }, function (error, response, body) {

                  response.statusCode.should.equal(200);
                  request.post({ headers: {"Accept": "application/json"}
                               , uri: rootUrl + '/users/login'
                               , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

                    response.statusCode.should.equal(200);
                    body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request
                    body.username.should.equal("UserOne");

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
      });
      });
    });

    it('should be able to update a user\'s gravatar email and url', function (done) {
      async.waterfall([
        function (cb) {
          user1.gravatar.url.should.equal('https://secure.gravatar.com/avatar/f0bc417475309b482b4ee5479f2e844e?d=wavatar');
          user1.gravatar.email.should.equal('user1@nfa.com');
          cb();
        }
      , async.apply(logUserOut)
      , async.apply(logUserIn, 'user1@nfa.com', 'supersecret')
      , function (cb) {
          request.put({ headers: {"Accept": "application/json"}
                       , uri: rootUrl + '/users/you/updateGravatarEmail'
                       , json: { newGravatarEmail: 'louis.chatriot@gmail.com' } }, function (error, response, body) {
            response.statusCode.should.equal(200);
            User.findOne({ email: 'user1@nfa.com' }, function (err, user) {
              user.gravatar.url.should.equal('https://secure.gravatar.com/avatar/e47076995bbe79cfdf507d7bbddbe106?d=wavatar');
              user.gravatar.email.should.equal('louis.chatriot@gmail.com');
              cb();
            });
          });
        }
      ], done);
    });

  });   // ==== End of 'PUT users' ==== //


  describe('Account and user creation', function() {
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

    it('should not be able to create two accounts with same email', function (done) {
      var userNumber, obj;

      User.find({}, function(err, users) {
        userNumber = users.length;
        request.post({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users'
                     , json: {username: "Louiiis", email: "valid@email.com", password: "supersecret"} }, function (error, response, body) {

          response.statusCode.should.equal(201);

          request.post({ headers: {"Accept": "application/json"}
                       , uri: rootUrl + '/users'
                       , json: {username: "Charles", email: "valid@email.com", password: "supersecret"} }, function (error, response, body) {

            response.statusCode.should.equal(409);
            body.duplicateField.should.equal("login");

            User.find({}, function (err, users) {
              users.length.should.equal(userNumber + 1);   // Only one user is created

              done();
            });
          });
        });
      });
    });
  });   // ==== End of 'Account and user creation' ==== //


  describe('Authentication and session', function() {

    it('Should not be able to log in as UserOne with a wrong password', function (done) {
      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "user1@nfa.com", password: "superse" } }, function (error, response, body) {
        response.statusCode.should.equal(401);
        response.headers['www-authenticate'].should.equal(i18n.invalidPwd);
        done();
      });
    });

    it('Should not be able to log in with a wrong username', function (done) {
      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "anotheruser@nfa.com", password: "superse" } }, function (error, response, body) {
        response.statusCode.should.equal(401);
        response.headers['www-authenticate'].should.equal(i18n.unknownUser);
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
        response.headers['www-authenticate'].should.equal(i18n.unknownUser);
        obj = JSON.parse(body);
        assert.isDefined(obj.message);
        assert.isUndefined(obj.email);

        request.post({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/login'
                     , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

          response.statusCode.should.equal(200);
          body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request
          assert.isUndefined(body.password);

          request.get({ headers: {"Accept": "application/json"}
                      , uri: rootUrl + '/users/you' }, function (error, response, body) {

            response.statusCode.should.equal(200);
            obj = JSON.parse(body);
            obj.email.should.equal("user1@nfa.com");
            assert.isUndefined(obj.password);

            request.get({ headers: {"Accept": "application/json"}
                        , uri: rootUrl + '/users/logout' }, function (error, response, body) {

              response.statusCode.should.equal(200);

              request.get({ headers: {"Accept": "application/json"}
                           , uri: rootUrl + '/users/you' }, function (error, response, body) {

                response.statusCode.should.equal(401);
                response.headers['www-authenticate'].should.equal(i18n.unknownUser);
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
        , obj
        , user;

      async.waterfall([
        async.apply(logUserIn, 'user1@nfa.com', 'supersecret')
      , function(cb) {
          request.post({ headers: {"Accept": "application/json"}
                       , uri: rootUrl + '/tldrs'
                       , json: tldrData1 }, function (error, response, body) {

            Tldr.findOne({possibleUrls: 'http://myfile.com/movie'}, function(err, tldr) {

              request.post({ headers: {"Accept": "application/json"}
                           , uri: rootUrl + '/users/login'
                           , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

                user = body;
                user.email.should.equal("user1@nfa.com");   // Login successful as User 1
                request.post({ headers: {"Accept": "application/json"}
                             , uri: rootUrl + '/tldrs'
                             , json: tldrData2 }, function (error, response, body) {

                  tldr = body;
                  tldr.creator.username.should.equal('UserOne');   // Should be an ObjectId, hence length of 24
                  request.post({ headers: {"Accept": "application/json"}
                               , uri: rootUrl + '/tldrs'
                               , json: tldrData3 }, function (error, response, body) {

                    request.get({ headers: {"Accept": "application/json"}
                                 , uri: rootUrl + '/users/you/createdtldrs' }, function (error, response, body) {

                      obj = JSON.parse(body);
                      obj[1].url.should.equal("http://another.com/movie");
                      obj[0].url.should.equal("http://another.com/again");

                      request.get({ headers: {"Accept": "application/json"}
                                  , uri: rootUrl + '/users/logout' }, function (error, response, body) {

                        // Logout in case we have other tests after this one
                        cb();
                      });
                    });
                  });
                });
              });
            });
          });
        }
      ], done);
    });

    it('Geting a tldr should populate creator if exists', function (done) {
      var tldrData1 = { url: 'http://myfile.com/movie',
                       title: 'Blog NFA',
                       summaryBullets: ['Awesome Blog'],
                       resourceAuthor: 'NFA Crew',
                       resourceDate: '2012',
                       createdAt: new Date(),
                       updatedAt: new Date()
                     }
        , obj;


      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

        response.statusCode.should.equal(200);
        request.post({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/tldrs'
                     , json: tldrData1 }, function (error, response, body) {

        request.get({ headers: {"Accept": "application/json"}
                  , uri: rootUrl + '/tldrs/search?url=' + encodeURIComponent('http://myfile.com/movie') }, function (error, response, body) {
              response.statusCode.should.equal(200);
              obj = JSON.parse(body);
              obj.creator.username.should.equal('UserOne');
              request.get({ headers: {"Accept": "application/json"}
                          , uri: rootUrl + '/users/logout' }, function (error, response, body) {

                // Logout in case we have other tests after this one
                done();
              });
            });
        });
      });
    });

    it('should be able to login whatever the case of the email is', function (done) {
      var obj;

      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "UsEr1@nFA.Com", password: "supersecret" } }, function (error, response, body) {

         response.statusCode.should.equal(200);
         body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request
         done();

       });
    });
  });   // ==== End of 'Authentication and session' ==== //


  describe('Email confirmation', function () {

    it('should confirm user email with the corresponding routes and valid confirmation token', function (done) {
      var obj, confirmEmailToken;

      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

         response.statusCode.should.equal(200);
         body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request

         request.post({ headers: {"Accept": "application/json"}
                      , uri: rootUrl + '/confirm'
                      , json: {} }, function (error, response, body) {

           // Should return 400 if code is the provided as parameter
           response.statusCode.should.equal(403);
           User.findOne({ email: "user1@nfa.com" }, function (err, user) {

             // Retrieve validation Code by directly queryin the db
             confirmEmailToken = user.confirmEmailToken;
             user.confirmedEmail.should.be.false;

             request.post({ headers: {"Accept": "application/json"}
                          , uri: rootUrl + '/confirm'
                          , json: { confirmEmailToken: confirmEmailToken, email: user.email } }, function (error, response, body) {

               response.statusCode.should.equal(200);
               User.findOne({ email: "user1@nfa.com" }, function (err, user) {
                 user.confirmedEmail.should.be.true;

                 // Second call to confirm just returns validation ok
                 request.post({ headers: {"Accept": "application/json"}
                              , uri: rootUrl + '/confirm'
                              , json: { confirmEmailToken: confirmEmailToken, email: user.email } }, function (error, response, body) {

                   response.statusCode.should.equal(200);

                   done();
                 });
               });
             });
           });
         });
       });
    });


    it('should not confirm user email with bad confirm token ', function (done) {
      var obj;

      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/users/login'
                   , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

         response.statusCode.should.equal(200);
         body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request
         body.confirmedEmail.should.be.false;

           request.post({ headers: {"Accept": "application/json"}
                         , uri: rootUrl + '/confirm'
                         , json: { confirmEmailToken: "badToken", email: 'user1@nfa.com' } }, function (error, response, body) {

             response.statusCode.should.equal(403);
             done();
           });
         });
    });

    it('should send a new validation link if requested', function (done) {
      var obj;

      request.get({ headers: {"Accept": "application/json"}
                  , uri: rootUrl + '/resendConfirmToken' }, function (error, response, body) {
        response.statusCode.should.equal(401);
        response.headers['www-authenticate'].should.equal(i18n.unknownUser);
        request.post({ headers: {"Accept": "application/json"}
                     , uri: rootUrl + '/users/login'
                     , json: { email: "user1@nfa.com", password: "supersecret" } }, function (error, response, body) {

          response.statusCode.should.equal(200);
          body.email.should.equal("user1@nfa.com");   // We can use body directly it is json parsed by request

            User.findOne({ email: "user1@nfa.com" }, function (err, user) {

              // Retrieve validation Code by directly queryin the db
              var previousToken = user.confirmEmailToken;

              request.get({ headers: {"Accept": "application/json"}
                          , uri: rootUrl + '/resendConfirmToken' }, function (error, response, body) {

                response.statusCode.should.equal(200);
                User.findOne({ email: "user1@nfa.com" }, function (err, user) {
                  var newToken = user.confirmEmailToken;
                  assert(newToken !== previousToken);
                  done();
                });
              });
            });
          });
        });
      });
  });   // ==== End of 'Email confirmation' ==== //


  describe('Password reset', function() {
    it('Should send a reset password email if a token and an email are supplied', function (done) {

      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/user/sendResetPasswordEmail'
                   , json: { } }, function (error, response, body) {
        response.statusCode.should.equal(403);

        User.findOne({ email: "user1@nfa.com" }, function(err, user) {
          assert.isUndefined(user.resetPasswordToken);

          request.post({ headers: {"Accept": "application/json"}
                       , uri: rootUrl + '/user/sendResetPasswordEmail'
                       , json: { email: "" } }, function (error, response, body) {

            response.statusCode.should.equal(403);

            User.findOne({ email: "user1@nfa.com" }, function(err, user) {
              assert.isUndefined(user.resetPasswordToken);

              request.post({ headers: {"Accept": "application/json"}
                           , uri: rootUrl + '/user/sendResetPasswordEmail'
                           , json: { email: "user1@nfa.com" } }, function (error, response, body) {

                response.statusCode.should.equal(200);
                User.findOne({ email: "user1@nfa.com" }, function(err, user) {
                  user.getBasicCredentials(function (err, bc) {
                    assert.isDefined(bc.resetPasswordToken);
                    done();
                  });
                });
               });
            });
          });
        });
      });
    });

    it('Should not be able to reset password if some parameters are not supplied', function (done) {
      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/user/sendResetPasswordEmail'
                   , json: { email: "user1@nfa.com" } }, function (error, response, body) {
        response.statusCode.should.equal(200);

        User.findOne({ email: 'user1@nfa.com' }, function(err, user) {
          request.post({ headers: {"Accept": "application/json"}
                       , uri: rootUrl + '/user/resetPassword'
                       , json: { email: "user1@nfa.com" } }, function (error, response, body) {

            response.statusCode.should.equal(403);
            response.body.message.should.equal(i18n.wrongTokenOrEmail);

              request.post({ headers: {"Accept": "application/json"}
                           , uri: rootUrl + '/user/resetPassword'
                           , json: { token: "atoken" } }, function (error, response, body) {

                response.statusCode.should.equal(403);
                response.body.message.should.equal(i18n.wrongTokenOrEmail);

                  request.post({ headers: {"Accept": "application/json"}
                               , uri: rootUrl + '/user/resetPassword'
                               , json: { email: 'rweee', resetPasswordToken: "atoken" } }, function (error, response, body) {

                    response.statusCode.should.equal(403);
                    response.body.password.should.equal(i18n.validateUserPwd);

                    done();
              });
            });
          });
        });
      });
    });

    it('Should not be able to reset password if some parameters are not valid', function (done) {
      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/user/sendResetPasswordEmail'
                   , json: { email: "user1@nfa.com" } }, function (error, response, body) {
        response.statusCode.should.equal(200);

        User.findOne({ email: 'user1@nfa.com' }).populate('credentials').exec(function(err, user) {
          request.post({ headers: {"Accept": "application/json"}
                       , uri: rootUrl + '/user/resetPassword'
                       , json: { email: "BAD@nfa.com", resetPasswordToken: user.credentials[0].resetPasswordToken, newPassword: "goodpassword" } }, function (error, response, body) {

            response.statusCode.should.equal(403);
            response.body.message.should.equal(i18n.wrongTokenOrEmail);

            request.post({ headers: {"Accept": "application/json"}
                           , uri: rootUrl + '/user/resetPassword'
                           , json: { email: user.email, resetPasswordToken: user.credentials[0].resetPasswordToken, newPassword: "BAD" } }, function (error, response, body) {

                response.statusCode.should.equal(403);
                response.body.password.should.equal(i18n.validateUserPwd);

                  request.post({ headers: {"Accept": "application/json"}
                               , uri: rootUrl + '/user/resetPassword'
                               , json: { email: 'user1@nfa.com', resetPasswordToken: "badtoken", newPassword: "goodpassword" } }, function (error, response, body) {

                    response.statusCode.should.equal(403);
                    response.body.message.should.equal(i18n.wrongTokenOrEmail);

                    done();
              });
            });
          });
        });
      });
    });

    it('Should be able to reset password if all parameters are valid', function (done) {
      request.post({ headers: {"Accept": "application/json"}
                   , uri: rootUrl + '/user/sendResetPasswordEmail'
                   , json: { email: "user1@nfa.com" } }, function (error, response, body) {
        response.statusCode.should.equal(200);

        User.findOne({ email: 'user1@nfa.com' }).populate('credentials').exec(function(err, user) {
          request.post({ headers: {"Accept": "application/json"}
                       , uri: rootUrl + '/user/resetPassword'
                       , json: { email: "user1@nfa.com", resetPasswordToken: user.credentials[0].resetPasswordToken, newPassword: "goodpassword" } }, function (error, response, body) {

            response.statusCode.should.equal(200);
            response.body.message.should.equal(i18n.passwordResetSuccessfully);
            User.findOne({ email: 'user1@nfa.com' }).populate('credentials').exec(function(err, user) {
              bcrypt.compareSync('goodpassword', user.credentials[0].password).should.equal(true);
              bcrypt.compareSync('supersecret', user.credentials[0].password).should.equal(false);

              done();
            });
          });
        });
      });
    });
  });   // ==== End of 'Password reset' ==== //


  describe('PUT topic', function () {

    it('Should not do anything if called by a non logged user', function (done) {
      async.waterfall([
        async.apply(logUserOut)
      , function (cb) {
          request.put({ headers: {"Accept": "application/json"}
                      , json: { direction: 1 }
                      , uri: rootUrl + '/forum/topics/' + topic1._id}, function (err, res, obj) {
            res.statusCode.should.equal(401);

            cb();
          });
        }
      ], done);
    });

    it('Should send a 404 if topic is not found', function (done) {
      async.waterfall([
        async.apply(logUserIn, "user1@nfa.com", "supersecret")
      , function (cb) {
          request.put({ headers: {"Accept": "application/json"}
                      , json: { direction: 1 }
                      , uri: rootUrl + '/forum/topics/123456789009876543211234' }, function (err, res, obj) {
            res.statusCode.should.equal(404);

            cb();
          });
        }
      ], done);
    });

    it('Should be able to vote for and against a topic', function (done) {
      async.waterfall([
        async.apply(logUserIn, "louis.chatriot@gmail.com", "supersecret")
      , function (cb) {
          request.put({ headers: {"Accept": "application/json"}
                      , json: { direction: 1 }
                      , uri: rootUrl + '/forum/topics/' + topic1._id }, function (err, res, obj) {
            res.statusCode.should.equal(200);
            Topic.findOne({ _id: topic1._id }, function (err, topic) {
              topic.votes.should.equal(2);

              cb();
            });
          });
        }
      ], done);
    });

  });   // ==== End of 'PUT topic' ==== //

});

