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

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    User.remove({}, function(err) {
      Tldr.remove({}, function (err) {
        if (err) {throw done(err);}
        done();
      });
    });
  });


  describe('#validators', function () {

    it('should detect missing required url arg', function (done) {

      var tldr = new Tldr({
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
        resourceDate: '2012',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      , valErr;

      tldr.save( function (err) {
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
        resourceAuthor: 'NFA Crew',
        resourceDate: '2012',
        createdAt: new Date(),
        updatedAt: new Date()}
        , tldr = new Tldr(tldrData)
        , valErr;

        tldr.save( function (err) {
          err.name.should.equal('ValidationError');

          _.keys(err.errors).length.should.equal(1);
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.url.should.not.equal(null);

          //domain extension is not valid
          tldrData.url = "http://myfile.tld/movie";
          tldr = new Tldr(tldrData);
        tldr.save( function (err) {
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.url.should.not.equal(null);

          tldrData.url = "http://blog.nfa.com/movie?url=avengers";
          tldr = new Tldr(tldrData);
          tldr.save( function (err) {
            assert.isNull(err);

            done();
          });
        });
      });

    });

    it('should use default createdAt and updatedAt args', function (done) {

      var tldr = new Tldr({
					url: 'http://needforair.com/nutcrackers',
					title: 'Blog NFA',
					summaryBullets: ['Awesome Blog'],
          resourceAuthor: 'NFA Crew',
          resourceDate: '2012'
				})
				, valErr;

      tldr.save( function (err) {
        assert.isNull(err, 'no errors');

        done();
      });

    });


    it('should detect missing required summary arg', function (done) {

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

      Tldr.createAndSaveInstance(tldrData, null, function (err) {
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

      Tldr.createAndSaveInstance(tldrData, null, function (err) {
          Tldr.find({resourceAuthor: 'bloup'})
              .populate('history')
              .exec(function (err,docs) {
            docs[0].history.versions.length.should.equal(1);
            assert.isUndefined(docs[0].history.versions[0].creator);

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
                     , email: 'valid@email.com' }
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

        Tldr.createAndSaveInstance(tldr, null, function (err) {
            if (err) { return done(err); }
            Tldr.find({url: tldr.url}, function (err,docs) {
              if (err) { return done(err); }

              Tldr.createAndSaveInstance(tldr, null, function (err) {
                  err.should.not.be.null;
                  err.code.should.equal(11000);// 11000 is the code for duplicate key
                  done();
                });
            });
          });
    });

  });

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

      Tldr.createAndSaveInstance(tldrData, null, function(err) {
          if (err) { return done(err); }
          Tldr.find({resourceAuthor: 'bloup'}, function (err,docs) {
            if (err) { return done(err); }

            var tldr = docs[0];
            tldr.url.should.equal('http://mydomain.com/');
            tldr.summaryBullets.should.include('coin');
            tldr.title.should.equal('Blog NFA');
            tldr.resourceAuthor.should.equal('bloup');

            // Perform update
            tldr.updateValidFields(updated, undefined, function(err) {
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
  });


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

      Tldr.createAndSaveInstance(userInput, null, function (err, theTldr) {
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

      Tldr.createAndSaveInstance(goodUserInput, null, function (err, tldr) {
        assert.isNull(err, 'no errors');
        tldr.updateValidFields(userInput, undefined, function(err, theTldr) {
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

       Tldr.createAndSaveInstance(userInput, null, function(err) {
         err.name.should.equal('CastError');   // Cant cast normal strings to date

         done();
       });
    });

    it('Should decode HTML entities', function (done) {

      var tldr = new Tldr({ url: 'http://needforair.com/nutcrackers',
                            title: 'toto&nbsp;titi',
                            summaryBullets: ['toto', 'tit&lt;i'],
                            resourceAuthor: 'NFA Crew',
                            resourceDate: '2012',
                            createdAt: new Date(),
                            updatedAt: new Date()
                          })
        , valErr;

      tldr.save( function (err, doc) {
        // We can test against the regular '<' character or its unicode escape equivalent
        doc.summaryBullets[1].should.equal( 'tit<i');
        doc.summaryBullets[1].should.equal( 'tit\u003ci');

        // We need to use the unicode escape here because this is not a regular space but a non breakable space
        doc.title.should.equal('toto\u00a0titi');
        done();
      });
    });

  });


  describe.only('history management', function(done) {

    it('should serialize only the fields we want to remember and be able to deserialize the string', function (done) {
      var tldr = new Tldr({ url: 'http://needforair.com/nutcrackers',
                            title: 'tototiti',
                            summaryBullets: ['toto', 'titi'],
                            resourceAuthor: 'NFA Crew',
                            resourceDate: '2012',
                            createdAt: new Date(),
                            updatedAt: new Date()
                          });

      tldr.save(function(err, _tldr) {
        var serializedVersion = _tldr.serialize()
          , objectVersion = Tldr.deserialize(serializedVersion);

        (typeof serializedVersion).should.equal('string');
        objectVersion.title.should.equal(_tldr.title);
        objectVersion.resourceAuthor.should.equal(_tldr.resourceAuthor);
        objectVersion.summaryBullets.length.should.equal(_tldr.summaryBullets.length);
        objectVersion.summaryBullets[0].should.equal(_tldr.summaryBullets[0]);
        objectVersion.summaryBullets[1].should.equal(_tldr.summaryBullets[1]);

        // resourceDate has been serialized and is not a date anymore
        objectVersion.resourceDate.should.equal(_tldr.resourceDate.toISOString());

        assert.isUndefined(objectVersion.url);
        assert.isUndefined(objectVersion.createdAt);
        assert.isUndefined(objectVersion.updatedAt);

        done();
      });
    });

    it('should behave as usual when there is no history (if the tldr was not created through createAndSaveInstance)', function (done) {
      var tldr = new Tldr({ url: 'http://needforair.com/nutcrackers',
                            title: 'tototiti',
                            summaryBullets: ['toto', 'titi'],
                            resourceAuthor: 'NFA Crew',
                            resourceDate: '2012',
                            createdAt: new Date(),
                            updatedAt: new Date()
                          });

      tldr.save(function(err, _tldr) {
        assert.isUndefined(_tldr.history);
        _tldr.title.should.equal('tototiti');

        _tldr.updateValidFields({ title: 'BLOUP' }, null, function (err, _tldr) {
          assert.isUndefined(_tldr.history);
          _tldr.title.should.equal('BLOUP');

          _tldr.updateValidFields({ title: 'blip' }, undefined, function (err, _tldr) {
            assert.isUndefined(_tldr.history);
            _tldr.title.should.equal('blip');

            done();
          });
        });
      });
    });


    it('should save previous version with the creator and contributors', function (done) {
      var tldrData = { title: 'Blog NFA'
                     , url: 'http://mydomain.com'
                     , summaryBullets: ['coin', 'hihan']
                     , resourceAuthor: 'bloup'
                     , createdAt: '2012'}
         , userData1 = { username: 'eee', password: 'goodpassword', email: 'va11d@email.com' }
         , userData2 = { username: 'eehhhhe', password: 'goodp2ssword', email: 'vali2@email.com' }
         , userData3 = { username: 'eeh3hhe', password: 'goo3p2ssword', email: 't3li2@email.com' }
         , deserialized;

      // Create a user according to userData
      function createUser (userData, cb) { User.createAndSaveInstance(userData, function(err, user) { return cb(err, user); }); }

      async.auto({
        // Create 3 users and a tldr
        user1: async.apply(createUser, userData1)
      , user2: async.apply(createUser, userData2)
      , user3: async.apply(createUser, userData3)
      , tldr: ['user1', function(cb, results) {
          Tldr.createAndSaveInstance(tldrData, results.user1, function(err, tldr) {
            return cb(err, tldr);
          });
        }]

        // First test
      , test1: ['tldr', function(cb, results) {
          assert.isDefined(results.tldr.history);
          done();
        }]

        // Update the tldr twice and get the history of the tldr
      , history: ['test1', 'tldr', 'user2', 'user3', function(cb, results) {
          results.tldr.updateValidFields({ title: 'Hellooo' }, results.user2, function () {
            results.tldr.updateValidFields({ summaryBullets: ['only one'] }, results.user3, function () {
              TldrHistory.findOne({ _id: results.tldr.history }, function(err, history) { return cb(err, history); });
            });
          });
        }]

        // Second test, actually test the history
      , test2: ['history', function(cb, results) {
          results.history.versions.length.should.equal(3);

          // Data was saved as expected
          deserialized = Tldr.deserialize(results.history.versions[0].data);
          deserialized.title.should.equal("Hellooo");
          deserialized.summaryBullets.length.should.equal(1);
          deserialized.summaryBullets[0].should.equal("only one");

          deserialized = Tldr.deserialize(results.history.versions[1].data);
          deserialized.title.should.equal("Hellooo");
          deserialized.summaryBullets.length.should.equal(2);
          deserialized.summaryBullets[0].should.equal("coin");
          deserialized.summaryBullets[1].should.equal("hihan");

          deserialized = Tldr.deserialize(results.history.versions[2].data);
          deserialized.title.should.equal("Blog NFA");
          deserialized.summaryBullets.length.should.equal(2);
          deserialized.summaryBullets[0].should.equal("coin");
          deserialized.summaryBullets[1].should.equal("hihan");

          // The data was saved with the correct creators
          results.history.versions[0].creator.toString().should.equal(results.user3._id.toString());
          results.history.versions[1].creator.toString().should.equal(results.user2._id.toString());
          results.history.versions[2].creator.toString().should.equal(results.user1._id.toString());

          done();
        }]
      });

    });


    it('should be able to go back one version', function (done) {
      var tldrData = { title: 'Blog NFA'
                     , url: 'http://mydomain.com'
                     , summaryBullets: ['coin', 'hihan']
                     , resourceAuthor: 'bloup'
                     , createdAt: '2012'}
         , userData1 = { username: 'eee', password: 'goodpassword', email: 'va11d@email.com' }
         , userData2 = { username: 'eehhhhe', password: 'goodp2ssword', email: 'vali2@email.com' }
         , userData3 = { username: 'eeh3hhe', password: 'goo3p2ssword', email: 't3li2@email.com' }
         , deserialized;

      User.createAndSaveInstance(userData1, function(err, user1) {
        User.createAndSaveInstance(userData2, function(err, user2) {
          User.createAndSaveInstance(userData3, function(err, user3) {
            Tldr.createAndSaveInstance(tldrData, user1, function(err, tldr) {
              tldr.updateValidFields({ title: 'Hellooo' }, user2, function () {
                tldr.updateValidFields({ summaryBullets: ['only one'] }, user3, function () {

                  // Actual test can now take place
                  tldr.title.should.equal("Hellooo");
                  tldr.summaryBullets[0].should.equal("only one");

                  tldr.goBackOneVersion(function(err, tldr) {
                    tldr.title.should.equal("Hellooo");
                    tldr.summaryBullets[0].should.equal("coin");
                    tldr.summaryBullets[1].should.equal("hihan");
                    tldr.versionDisplayed.should.equal(1);

                    tldr.goBackOneVersion(function(err, tldr) {
                      tldr.title.should.equal("Blog NFA");
                      tldr.summaryBullets[0].should.equal("coin");
                      tldr.summaryBullets[1].should.equal("hihan");
                      tldr.versionDisplayed.should.equal(2);

                      // No previous version !
                      tldr.goBackOneVersion(function(err, tldr) {
                        tldr.title.should.equal("Blog NFA");
                        tldr.summaryBullets[0].should.equal("coin");
                        tldr.summaryBullets[1].should.equal("hihan");
                        tldr.versionDisplayed.should.equal(2);

                        tldr.updateValidFields({ title: 'reset' }, undefined, function (err, tldr) {
                          tldr.title.should.equal('reset');
                          tldr.versionDisplayed.should.equal(0);

                          done();
                        });
                      });
                    });
                  });
                })
              });
            });
          });
        });
      });
    });




  });

});
