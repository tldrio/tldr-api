/**
 * Tldr tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , sinon = require('sinon')
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../lib/models')
  , normalizeUrl = require('../lib/customUtils').normalizeUrl
  , Tldr = models.Tldr
  , User = models.User
  , TldrHistory = models.TldrHistory
  , server = require('../server')
  , db = server.db
  , url = require('url')
  , async = require('async');





/**
 * Tests
 */


describe('Tldr', function () {
  var user;

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    User.remove({}, function(err) {
      Tldr.remove({}, function (err) {
        User.createAndSaveInstance({ username: "eeee", password: "eeeeeeee", email: "valid@email.com" }, function(err, _user) {
          user = _user;
          done();
        });

      });
    });
  });


  describe('#validators', function () {

    it('should detect missing required url arg', function (done) {
      var tldrData = {
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
      }
      , valErr;

      Tldr.createAndSaveInstance( tldrData, user, function (err, tldr) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.url.should.not.equal(null);

        done();
      });
    });

    it('should accept only valid urls ', function (done) {

      var tldrData = {
        url: 'javascript:function(){}',
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew'}
        , valErr;

        Tldr.createAndSaveInstance( tldrData, user, function (err) {
          err.name.should.equal('ValidationError');

          _.keys(err.errors).length.should.equal(1);
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.url.should.not.equal(null);

          // Bad protocol
          tldrData.url = "ftp://myfile.tld/movie";

          Tldr.createAndSaveInstance(tldrData, user, function(err) {
            valErr = models.getAllValidationErrorsWithExplanations(err.errors);
            valErr.url.should.not.equal(null);

            tldrData.url = "http://blog.nfa.com/movie?url=avengers";

            Tldr.createAndSaveInstance( tldrData, user, function (err) {
              assert.isNull(err);

              done();
            });
          });
      });

    });


    it('should detect missing required summary arg', function (done) {

      var tldrData = {
          url: 'http://needforair.com/nutcrackers',
          title: 'Blog NFA',
          resourceAuthor: 'NFA Crew',
          }
        , valErr;

      Tldr.createAndSaveInstance(tldrData, user, function (err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
				valErr = models.getAllValidationErrorsWithExplanations(err.errors);
				valErr.summaryBullets.should.not.equal(null);

        done();
      });

    });

    it('should detect wrong type of arg for dates bitch', function (done) {

      var tldr = new Tldr({
        url: 'http://needforair.com/nutcrackers',
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
        resourceDate: 'NFA Crew',
        createdAt: 'eiugherg',
        updatedAt: '2012'
      })
      , valErr;

      tldr.save( function (err) {
        err.name.should.equal('CastError');
        done();
      });

    });


    it('should reject tldrs whose summary is missing', function (done) {

      var tldr = new Tldr({
        url: 'http://needforair.com/nutcrackers',
        title: 'Blog NFA',
        resourceAuthor: 'NFA Crew',
        resourceDate: '2012',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });


    it('should reject tldrs whose summary is an empty array', function (done) {

      var tldr = new Tldr({
        url: 'http://needforair.com/nutcrackers',
        title: 'Blog NFA',
        summaryBullets: [],
        resourceAuthor: 'NFA Crew',
        resourceDate: '2012',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });


    it('should reject tldrs whose summary contains empty bullets', function (done) {

      var tldr = new Tldr({
        url: 'http://needforair.com/nutcrackers',
        title: 'Blog NFA',
        summaryBullets: ['weqrqweqw eqwe qwe', '', 'amnother bullet'],
        resourceAuthor: 'NFA Crew',
        resourceDate: '2012',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });


    it('should reject tldrs whose summary contains too many bullets', function (done) {

      var tldr = new Tldr({
        url: 'http://needforair.com/nutcrackers',
        title: 'Blog NFA',
        summaryBullets: ['weqrqweqw eqwe qwe', 'adad', 'amnother bullet', 'eweqweq', 'qweqwe', 'qweqweqwe'],
        resourceAuthor: 'NFA Crew',
        resourceDate: '2012',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });


    it('should reject tldrs whose summary contains a bullet that\'s too long', function (done) {

      var tldr = new Tldr({
        url: 'http://needforair.com/nutcrackers',
        title: 'Blog NFA',
        summaryBullets: ['weqrqweqw eqwe qwe', 'adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee w'],
        resourceAuthor: 'NFA Crew',
        resourceDate: '2012',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });


  });


  describe('#createAndSaveInstance', function () {

    it('should allow user to set url, title, summary and resourceAuthor only', function (done) {
      var tldrData = { title: 'Blog NFA'
        , url: 'http://mydomain.com'
        , summaryBullets: ['coin']
        , resourceAuthor: 'bloup'
        , createdAt: '2012'};

      Tldr.createAndSaveInstance(tldrData, user, function (err) {
          if (err) { return done(err); }
          Tldr.find({resourceAuthor: 'bloup'}, function (err,docs) {
            if (err) { return done(err); }

            var tldr = docs[0];
            tldr.url.should.equal('http://mydomain.com/');
            tldr.summaryBullets.should.include('coin');
            tldr.resourceAuthor.should.equal('bloup');
            tldr.createdAt.should.not.equal('2012');

            done();
          });
        });
    });

    it('should initialize a new tldr\'s history with the first version of the data', function (done) {
      var tldrData = { title: 'Blog NFA'
                     , url: 'http://mydomain.com'
                     , summaryBullets: ['coin']
                     , resourceAuthor: 'bloup'
                     , createdAt: '2012'}
        , deserialized;

      Tldr.createAndSaveInstance(tldrData, user, function (err) {
          Tldr.find({resourceAuthor: 'bloup'})
              .populate('history')
              .exec(function (err,docs) {
            docs[0].history.versions.length.should.equal(1);
            docs[0].history.versions[0].creator.toString().should.equal(user._id.toString());

            deserialized = Tldr.deserialize(docs[0].history.versions[0].data);
            deserialized.title.should.equal(tldrData.title);
            deserialized.resourceAuthor.should.equal(tldrData.resourceAuthor);
            deserialized.summaryBullets.length.should.equal(tldrData.summaryBullets.length);
            deserialized.summaryBullets[0].should.equal(tldrData.summaryBullets[0]);

            done();
          });
        });
    });

    it('should set a new tldr\'s creator and reflect it in the history', function (done) {
      var tldrData = { title: 'Blog NFA'
                     , url: 'http://mydomain.com'
                     , summaryBullets: ['coin']
                     , resourceAuthor: 'bloup'
                     , createdAt: '2012'}
        , userData = { username: 'blip'
                     , password: 'supersecret'
                     , email: 'valid@eZZZmail.com' }
        , deserialized;

        User.createAndSaveInstance(userData, function(err, user) {
          Tldr.createAndSaveInstance(tldrData, user, function (err, tldr) {
            Tldr.find({resourceAuthor: 'bloup'})
            .populate('history')
            .exec(function (err, docs) {


              // The history is initialized with the tldr's creator
              docs[0].history.versions.length.should.equal(1);
              docs[0].history.versions[0].creator.toString().should.equal(user._id.toString());
              deserialized = Tldr.deserialize(docs[0].history.versions[0].data);
              deserialized.title.should.equal(tldrData.title);

              // The right creator is set and he the tldr is part of his tldrsCreated
              docs[0].creator.toString().should.equal(user._id.toString());
              User.findOne({ _id: docs[0].creator }, function (err, reUser) {
                reUser.tldrsCreated[0].toString().should.equal(docs[0]._id.toString());

                done();
              });
            });
          });
        });
    });

    it('should not save two tldrs with same url', function (done) {
      var tldr = { title: 'Blog NFA'
        , url: 'http://mydomain.com'
        , summaryBullets: ['coin']
        , resourceAuthor: 'bloup'
        , createdAt: '2012'};

        Tldr.createAndSaveInstance(tldr, user, function (err) {
            if (err) { return done(err); }
            Tldr.find({url: tldr.url}, function (err,docs) {
              if (err) { return done(err); }

              Tldr.createAndSaveInstance(tldr, user, function (err) {
                  err.should.not.be.null;
                  err.code.should.equal(11000);// 11000 is the code for duplicate key
                  done();
                });
            });
          });
    });

    it('should set a new tldr\'s creator and reflect it in the history', function (done) {
      var tldrData = { title: 'Blog NFA'
                     , url: 'http://mydomain.com'
                     , summaryBullets: ['coin']
                     , resourceAuthor: 'bloup'
                     , createdAt: '2012'}
        , userData = { username: 'blip'
                     , password: 'supersecret'
                     , email: 'valid@eZZZmail.com' }
        , deserialized;

        User.createAndSaveInstance(userData, function(err, user) {
          Tldr.createAndSaveInstance(tldrData, user, function (err, tldr) {
            User.findOne({ _id: user._id })
            .populate('history')
            .exec(function (err, user) {
              // The history is initialized with the tldr's creator
              user.history.actions.length.should.equal(2);
              user.history.actions[0].type.should.equal('tldrCreation');
              deserialized = Tldr.deserialize(user.history.actions[0].data);
              deserialized.title.should.equal(tldrData.title);

              user.history.actions[1].type.should.equal('accountCreation');

              done();
            });
          });
        });
    });

  });   // ==== End of '#createAndSaveInstance' ==== //

  describe('#updateValidFields', function () {

    it('should restrict the fields the user is allowed to update', function (done) {
        var updated = {url: 'http://myotherdomain.com'
                      , summaryBullets: ['new2']
                      , title: 'Blog NeedForAir'
                      , resourceAuthor: 'new3'
                      , createdAt: '2012'}
          , tldrData = { title: 'Blog NFA'
                       , url: 'http://mydomain.com'
                       , summaryBullets: ['coin']
                       , resourceAuthor: 'bloup'};

      Tldr.createAndSaveInstance(tldrData, user, function(err) {
          if (err) { return done(err); }
          Tldr.find({resourceAuthor: 'bloup'}, function (err,docs) {
            if (err) { return done(err); }

            var tldr = docs[0];
            tldr.url.should.equal('http://mydomain.com/');
            tldr.summaryBullets.should.include('coin');
            tldr.title.should.equal('Blog NFA');
            tldr.resourceAuthor.should.equal('bloup');

            // Perform update
            tldr.updateValidFields(updated, user, function(err) {
              if (err) { return done(err); }

              tldr.url.should.equal('http://mydomain.com/');
              tldr.summaryBullets.should.include('new2');
              tldr.title.should.equal('Blog NeedForAir');
              tldr.resourceAuthor.should.equal('new3');
              tldr.createdAt.should.not.equal('2012');

              done();
            });
          });
        });
    });

    it('should not save version to history if an update is not successful', function (done) {
      var tldrData = { title: 'Blog NFA'
                     , url: 'http://mydomain.com'
                     , summaryBullets: ['coin']
                     , resourceAuthor: 'bloup'}
        , theTldr;

      Tldr.createAndSaveInstance(tldrData, user, function (err, tldr) {
        theTldr = tldr;
        TldrHistory.findOne({ _id: theTldr.history }, function (err, history) {
          history.versions.length.should.equal(1);   // History has the first version of the tldr

          // Won't validate
          theTldr.updateValidFields({ title: '' }, user, function(err) {
            assert.isDefined(err);   // Update failed

            TldrHistory.findOne({ _id: theTldr.history }, function (err, history) {
              history.versions.length.should.equal(1);   // History should not have been modified
              done();
            });
          });
        });
      });
    });

    it('should update users histories when they update a tldr', function (done) {
      // This test is part of the "should save current version with the creator and contributors, and update users histories"
      // test in the "history management" suite. This stub is here so that you don't wonder whether the 'save user action' part
      // of updateValidFields is really tested or not.
      done();
    });

  });   // ==== End of '#updateValidFields' ==== //


  describe('#normalizeUrl', function() {

    it('Should keep correctly formatted urls unchanged and don\'t tamper with trailing slashes', function (done) {
      var theUrl = "http://domain.tld/path/file.extension";
      normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");

      theUrl = "http://domain.tld/path/res/";
      normalizeUrl(theUrl).should.equal("http://domain.tld/path/res/");

      theUrl = "http://domain.tld/path/file.extension?arg=value&otherarg=othervalue";
      normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension?arg=value&otherarg=othervalue");

      theUrl = "http://domain.tld/?aRg=valuEEe";
      normalizeUrl(theUrl).should.equal("http://domain.tld/?aRg=valuEEe");

      done();
    });

    it('Should keep correctly formatted urls with only domain/subdomain, adding a forgotten trailing slash', function (done) {
      var theUrl = "http://domain.tld/";
      normalizeUrl(theUrl).should.equal("http://domain.tld/");

      theUrl = "http://domain.tld";
      normalizeUrl(theUrl).should.equal("http://domain.tld/");

      theUrl = "http://subdomain.domain.tld/";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/");

      theUrl = "http://subdomain.domain.tld";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/");

      theUrl = "http://subdomain.domain.tld?arg=value";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/?arg=value");

      done();
    });

    it('Should remove a trailing hash with its fragment except if it a #!', function (done) {
      var theUrl = "http://www.domain.tld/path/file.extension/#";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/path/file.extension/");

      theUrl = "http://www.domain.tld/path/file.extension/#something";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/path/file.extension/");

      theUrl = "http://www.domain.tld/path/file.extension#";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/path/file.extension");

      theUrl = "http://www.domain.tld/path/file.extension#something";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/path/file.extension");

      theUrl = "http://www.domain.tld/#";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/");

      theUrl = "http://www.domain.tld/#something";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/");

      theUrl = "http://www.domain.tld#";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/");

      theUrl = "http://www.domain.tld#something";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/");

      theUrl = "http://www.domain.tld/#!bloup";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/#!bloup");

      theUrl = "http://www.domain.tld/#!/path/to/somethingelse";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/#!/path/to/somethingelse");

      theUrl = "http://www.domain.tld/path#!bloup";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/path#!bloup");

      theUrl = "http://www.domain.tld/path?arg=value#!bloup";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/path?arg=value#!bloup");

      theUrl = "http://www.domain.tld/path?arg=value#bloup";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/path?arg=value");

      done();
    });

    it('Should lowercase the DNS part and keep the given path case', function (done) {
      var theUrl = "hTTp://subdOMaiN.dOmaIn.tLD/path/fiLE.exTENsion/";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/fiLE.exTENsion/");

      done();
    });

    it('Should remove the port if it is 80, keep it otherwise', function (done) {
      var theUrl = "http://subdomain.domain.tld:80/path/file.extension/";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension/");

      theUrl = "http://subdomain.domain.tld:99/path/file.extension/";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld:99/path/file.extension/");

      done();
    });

    it('Remove a querystring if there are no arguments - it is only a "?"', function (done) {
      var theUrl = "http://subdomain.domain.tld/path/file.extension/?";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension/");

      theUrl = "http://subdomain.domain.tld/path/file.extension?";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension");

      done();
    });

    it('Sort the arguments of a querystring and remove the useless ones', function (done) {
      var theUrl = "http://subdomain.domain.tld/path/file.extension/?arg=value&rtf=yto";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension/?arg=value&rtf=yto");

      theUrl = "http://subdomain.domain.tld/path/file.extension?eee=value&cd=yto";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension?cd=yto&eee=value");

      theUrl = "http://subdomain.domain.tld/path/file.extension?caee=value&c5=yto";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension?c5=yto&caee=value");

      theUrl = "http://subdomain.domain.tld/path/file.extension?zzzzz=value&yyyyy=yto&utm_source=a&utm_medium=b&utm_content=c&utm_campaign=d&utm_term=e";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension?yyyyy=yto&zzzzz=value");

      theUrl = "http://subdomain.domain.tld/path/file.extension?caee=value&c5=yto&ffutm_sss=bloup&utma=b";  // Don't remove key of the utm_ is not the beginning of the string or the underscore is missing
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension?c5=yto&caee=value&ffutm_sss=bloup&utma=b");

      done();
    });

  });


  describe('XSS prevention and user input cleaning and decoding', function () {

    it('Should sanitize user generated fields when creating a tldr with createAndSaveInstance', function (done) {
      var userInput = {
          url: 'http://needfdocument.cookieorair.com/nutcrackers',
          title: 'Blog NFdocument.writeA',
          summaryBullets: ['Aweso.parentNodeme Blog', 'B.innerHTMLloup'],
          resourceAuthor: 'NFA Crewwindow.location',
          resourceDate: '2012'
          };

      Tldr.createAndSaveInstance(userInput, user, function (err, theTldr) {
        assert.isNull(err, 'no errors');
        theTldr.url.should.equal('http://needforair.com/nutcrackers');   // The 'document.cookie' part is a forbidden string that was removed
        theTldr.title.should.equal('Blog NFA');
        theTldr.summaryBullets[0].should.equal('Awesome Blog');
        theTldr.summaryBullets[1].should.equal('Bloup');
        theTldr.resourceAuthor.should.equal('NFA Crew');

        done();
      });
    });

    it('Should sanitize user generated fields when updating a tldr', function (done) {
      var goodUserInput = {
          url: 'http://url.com/nutcrackers',
          title: 'Yipiie',
          summaryBullets: ['AwBlog', 'Bzzzup'],
          resourceAuthor: 'Someone',
          }
        , userInput = {
          url: 'http://needfdocument.cookieorair.com/nutcrackers',
          title: 'Blog NFdocument.writeA',
          summaryBullets: ['Aweso.parentNodeme Blog', 'B.innerHTMLloup'],
          resourceAuthor: 'NFA Crewwindow.location',
          };

      Tldr.createAndSaveInstance(goodUserInput, user, function (err, tldr) {
        assert.isNull(err, 'no errors');
        tldr.updateValidFields(userInput, user, function(err, theTldr) {
          assert.isNull(err, 'no errors');
          theTldr.url.should.equal('http://url.com/nutcrackers');   // url is not updatable
          theTldr.title.should.equal('Blog NFA');
          theTldr.summaryBullets[0].should.equal('Awesome Blog');
          theTldr.summaryBullets[1].should.equal('Bloup');
          theTldr.resourceAuthor.should.equal('NFA Crew');

          done();
        });
      });
    });

    it('The field resourceDate doesnt need to be sanitized as only numbers or date strings are tolerated', function (done) {
      var userInput = {
          url: 'http://url.com/nutcrackers',
          title: 'Yipiie',
          summaryBullets: ['AwBlog', 'Bzzzup'],
          resourceAuthor: 'Someone',
          resourceDate: 'document'   // Try to put a string, like document.cookie or document.write
          }

       Tldr.createAndSaveInstance(userInput, user, function(err) {
         err.name.should.equal('CastError');   // Cant cast normal strings to date

         done();
       });
    });

    it('Should decode HTML entities', function (done) {

      var tldrData = { url: 'http://needforair.com/nutcrackers',
                            title: 'toto&nbsp;titi',
                            summaryBullets: ['toto', 'tit&lt;i'],
                            resourceAuthor: 'NFA Crew',
                     }
        , valErr;

      Tldr.createAndSaveInstance(tldrData, user, function (err, doc) {
        // We can test against the regular '<' character or its unicode escape equivalent
        doc.summaryBullets[1].should.equal( 'tit<i');
        doc.summaryBullets[1].should.equal( 'tit\u003ci');

        // We need to use the unicode escape here because this is not a regular space but a non breakable space
        doc.title.should.equal('toto\u00a0titi');
        done();
      });
    });

  });


  describe('history management', function(done) {

    it('should serialize only the fields we want to remember and be able to deserialize the string', function (done) {
      var tldrData = { url: 'http://needforair.com/nutcrackers',
                            title: 'tototiti',
                            summaryBullets: ['toto', 'titi'],
                            resourceAuthor: 'NFA Crew',
                          };

      Tldr.createAndSaveInstance(tldrData, user, function(err, _tldr) {
        var serializedVersion = _tldr.serialize()
          , objectVersion = Tldr.deserialize(serializedVersion);

        (typeof serializedVersion).should.equal('string');
        objectVersion.title.should.equal(_tldr.title);
        objectVersion.resourceAuthor.should.equal(_tldr.resourceAuthor);
        objectVersion.summaryBullets.length.should.equal(_tldr.summaryBullets.length);
        objectVersion.summaryBullets[0].should.equal(_tldr.summaryBullets[0]);
        objectVersion.summaryBullets[1].should.equal(_tldr.summaryBullets[1]);

        assert.isUndefined(objectVersion.url);
        assert.isUndefined(objectVersion.createdAt);
        assert.isUndefined(objectVersion.updatedAt);

        done();
      });
    });

    it('should save current version with the creator and contributors, and update users histories', function (done) {
      var tldrData = { title: 'Blog NFA'
                     , url: 'http://mydomain.com'
                     , summaryBullets: ['coin', 'hihan']
                     , resourceAuthor: 'bloup'
                     , createdAt: '2012'}
         , userData1 = { username: 'eee', password: 'goodpassword', email: 'va11d@email.com' }
         , userData2 = { username: 'eehhhhe', password: 'goodp2ssword', email: 'vali2@email.com' }
         , userData3 = { username: 'eeh3hhe', password: 'goo3p2ssword', email: 't3li2@email.com' }
         , users = {}, theTldr, theHistory, deserialized;

      // Create a user according to userData and store him in the users object
      function createUser (userData, name, cb) { User.createAndSaveInstance(userData, function(err, user) { users[name] = user; return cb(err); }); }

      async.waterfall([
        // Create 3 users and a tldr
        async.apply(createUser, userData1, 'user1')
      , async.apply(createUser, userData2, 'user2')
      , async.apply(createUser, userData3, 'user3')
      , function(cb) {
          Tldr.createAndSaveInstance(tldrData, users.user1, function(err, tldr) {
            theTldr = tldr;
            return cb(err);
          });
        }

        // First test
      , function(cb) {
          assert.isDefined(theTldr.history);
          cb();
        }

        // Update the tldr twice and get the history of the tldr
      , function(cb) {
          theTldr.updateValidFields({ title: 'Hellooo' }, users.user2, function () {
            theTldr.updateValidFields({ summaryBullets: ['only one'] }, users.user3, function () {
              TldrHistory.findOne({ _id: theTldr.history }, function(err, history) {
                theHistory = history;
                return cb(err);
              });
            });
          });
        }

        // Second test, actually test the history
      , function(cb) {
          theHistory.versions.length.should.equal(3);

          // Data was saved as expected
          deserialized = Tldr.deserialize(theHistory.versions[0].data);
          deserialized.title.should.equal("Hellooo");
          deserialized.summaryBullets.length.should.equal(1);
          deserialized.summaryBullets[0].should.equal("only one");

          deserialized = Tldr.deserialize(theHistory.versions[1].data);
          deserialized.title.should.equal("Hellooo");
          deserialized.summaryBullets.length.should.equal(2);
          deserialized.summaryBullets[0].should.equal("coin");
          deserialized.summaryBullets[1].should.equal("hihan");

          deserialized = Tldr.deserialize(theHistory.versions[2].data);
          deserialized.title.should.equal("Blog NFA");
          deserialized.summaryBullets.length.should.equal(2);
          deserialized.summaryBullets[0].should.equal("coin");
          deserialized.summaryBullets[1].should.equal("hihan");

          // The data was saved with the correct creators
          theHistory.versions[0].creator.toString().should.equal(users.user3._id.toString());
          theHistory.versions[1].creator.toString().should.equal(users.user2._id.toString());
          theHistory.versions[2].creator.toString().should.equal(users.user1._id.toString());

          cb();
        }

        // Third test, test the users' histories were correctly updated
      , function (cb) {
          var des;

          User.findOne({ _id: users.user2._id })
              .populate('history')
              .exec(function (err, user) {

            user.history.actions.length.should.equal(2);
            user.history.actions[0].type.should.equal('tldrUpdate');
            des = Tldr.deserialize(user.history.actions[0].data);
            des.title.should.equal('Hellooo');
            des.summaryBullets[0].should.equal('coin');
            des.summaryBullets[1].should.equal('hihan');

            User.findOne({ _id: users.user3._id })
            .populate('history')
            .exec(function (err, user) {

              user.history.actions.length.should.equal(2);
              user.history.actions[0].type.should.equal('tldrUpdate');
              des = Tldr.deserialize(user.history.actions[0].data);
              des.title.should.equal('Hellooo');
              des.summaryBullets[0].should.equal('only one');
              cb();
            });
          });
        }
      ], done);

    });


    it('should be able to go back one version', function (done) {
      var tldrData = { title: 'Blog NFA'
                     , url: 'http://mydomain.com'
                     , summaryBullets: ['coin', 'hihan']
                     , resourceAuthor: 'bloup' }
         , userData1 = { username: 'eee', password: 'goodpassword', email: 'va11d@email.com' }
         , userData2 = { username: 'eehhhhe', password: 'goodp2ssword', email: 'vali2@email.com' }
         , userData3 = { username: 'eeh3hhe', password: 'goo3p2ssword', email: 't3li2@email.com' }
         , deserialized, theTldr
         , users = {};

      // Create a user according to userData
      function createUser (userData, name, cb) { User.createAndSaveInstance(userData, function(err, user) { users[name] = user; return cb(err); }); }

      async.waterfall([
        // Create 3 users and a tldr
        async.apply(createUser, userData1, 'user1')
      , async.apply(createUser, userData2, 'user2')
      , async.apply(createUser, userData3, 'user3')
      , function(cb) {
          Tldr.createAndSaveInstance(tldrData, users.user1, function(err, tldr) {
            theTldr = tldr;   // Keep a pointer to our tldr
            return cb(err);
          });
        }

        // Update the tldr twice and get the history of the tldr
      , function(cb) {
          theTldr.updateValidFields({ title: 'Hellooo' }, users.user2, function () {
            theTldr.updateValidFields({ summaryBullets: ['only one'] }, users.user3, function (err, tldr) {
              return cb(err);
            });
          });
        }

      , function(cb) {
          theTldr.title.should.equal("Hellooo");
          theTldr.summaryBullets[0].should.equal("only one");
          cb();
        }

      , function(cb) {
          theTldr.goBackOneVersion(function() { return cb(); });
        }

      , function(cb) {
          theTldr.title.should.equal("Hellooo");
          theTldr.summaryBullets[0].should.equal("coin");
          theTldr.summaryBullets[1].should.equal("hihan");
          theTldr.versionDisplayed.should.equal(1);
          cb();
        }

      , function(cb) {
          theTldr.goBackOneVersion(function() { return cb(); });
        }

      , function(cb) {
          theTldr.title.should.equal("Blog NFA");
          theTldr.summaryBullets[0].should.equal("coin");
          theTldr.summaryBullets[1].should.equal("hihan");
          theTldr.versionDisplayed.should.equal(2);
          cb();
        }

      , function(cb) {
          theTldr.goBackOneVersion(function() { return cb(); });
        }

      , function(cb) {
          theTldr.title.should.equal("Blog NFA");
          theTldr.summaryBullets[0].should.equal("coin");
          theTldr.summaryBullets[1].should.equal("hihan");
          theTldr.versionDisplayed.should.equal(2);
          cb();
        }

      , function(cb) {
          theTldr.updateValidFields({ title: 'reset' }, user, function (err, theTldr) {
            theTldr.title.should.equal('reset');
            theTldr.versionDisplayed.should.equal(0);

            cb();
          });
        }
      ], done);

    });




  });

});
