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
  , server = require('../server')
  , db = server.db
  , url = require('url');





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
    Tldr.remove( function (err) {
      if (err) {throw done(err);}
      done();
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
        url: 'javascript://myfile/movie',
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
      Tldr.createAndSaveInstance(
        { title: 'Blog NFA'
        , url: 'http://mydomain.com'
        , summaryBullets: ['coin']
        , resourceAuthor: 'bloup'
        , createdAt: '2012'},
        function (err) {
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

    it('should not save two tldrs with same url', function (done) {
      var tldr = { title: 'Blog NFA'
        , url: 'http://mydomain.com'
        , summaryBullets: ['coin']
        , resourceAuthor: 'bloup'
        , createdAt: '2012'};

        Tldr.createAndSaveInstance(
          tldr,
          function (err) {
            if (err) { return done(err); }
            Tldr.find({url: tldr.url}, function (err,docs) {
              if (err) { return done(err); }

              Tldr.createAndSaveInstance(
                tldr,
                function (err) {
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
                      , createdAt: '2012'};

      Tldr.createAndSaveInstance(
        { title: 'Blog NFA'
        , url: 'http://mydomain.com'
        , summaryBullets: ['coin']
        , resourceAuthor: 'bloup'},
        function(err) {
          if (err) { return done(err); }
          Tldr.find({resourceAuthor: 'bloup'}, function (err,docs) {
            if (err) { return done(err); }

            var tldr = docs[0];
            tldr.url.should.equal('http://mydomain.com/');
            tldr.summaryBullets.should.include('coin');
            tldr.title.should.equal('Blog NFA');
            tldr.resourceAuthor.should.equal('bloup');

            // Perform update
            tldr.updateValidFields(updated, function(err) {
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

    it('Sort the arguments of a querystring', function (done) {
      var theUrl = "http://subdomain.domain.tld/path/file.extension/?arg=value&rtf=yto";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension/?arg=value&rtf=yto");

      theUrl = "http://subdomain.domain.tld/path/file.extension?eee=value&cd=yto";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension?cd=yto&eee=value");

      theUrl = "http://subdomain.domain.tld/path/file.extension?caee=value&c5=yto";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension?c5=yto&caee=value");

      theUrl = "http://subdomain.domain.tld/path/file.extension?zzzzz=value&yyyyy=yto&utm_source=a&utm_medium=b&utm_content=c&utm_campaign=d&utm_term=e";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension?yyyyy=yto&zzzzz=value");

      done();
    });






  });



});
