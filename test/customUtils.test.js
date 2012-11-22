/**
 * Custom utils tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , customUtils = require('../lib/customUtils')
  , normalizeUrl = customUtils.normalizeUrl
  ;


describe('Custom utils', function () {

  describe('#timeago', function () {
    it('Should return just ago if span is under a minute', function (done) {
      var test;

      test = new Date((new Date()).getTime() - 10);
      customUtils.timeago(test).should.equal('just now');

      test = new Date((new Date()).getTime() - 900);
      customUtils.timeago(test).should.equal('just now');

      done();
    });

    it('Should return a nicely formatted timeago', function (done) {
      var test;

      test = new Date((new Date()).getTime() - 1000 * 60 * 4);
      customUtils.timeago(test).should.equal('4 minutes ago');

      test = new Date((new Date()).getTime() - 1000 * 61);
      customUtils.timeago(test).should.equal('a minute ago');

      test = new Date((new Date()).getTime() - 1000 * 60 * 60 * 24 * 12);
      customUtils.timeago(test).should.equal('12 days ago');

      done();
    });


  });   // ==== End of '#timeago' ==== //

  describe('#normalizeUrl', function() {

    it('Should keep correctly formatted urls unchanged', function (done) {
      var theUrl = "http://domain.tld/path/file.extension";
      normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");

      theUrl = "https://domain.tld/path/file.extension";
      normalizeUrl(theUrl).should.equal("https://domain.tld/path/file.extension");

      done();
    });

    it('Should remove the querystring for non whitelisted websites', function (done) {
      var theUrl = "http://domain.tld/?aRg=valuEEe";
      normalizeUrl(theUrl).should.equal("http://domain.tld/");

      theUrl = "http://subdomain.domain.tld?arg=value";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/");

      theUrl = "http://subdomain.domain.tld/bloup/blap?arg=value";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/bloup/blap");

      done();
    });

    it('Should keep querystring for whitelisted domains but remove the utm ones and sort the remaining arguments', function (done) {
      var theUrl = "http://www.youtube.com/?aRg=valuEEe";
      normalizeUrl(theUrl).should.equal("http://www.youtube.com/?aRg=valuEEe");

      theUrl = "http://www.youtube.com/?eRg=valuEEe&bloup=blap";
      normalizeUrl(theUrl).should.equal("http://www.youtube.com/?bloup=blap&eRg=valuEEe");

      theUrl = "http://www.youtube.com/?aRg=valuEEe&bloup=blap&utm_grok=big";
      normalizeUrl(theUrl).should.equal("http://www.youtube.com/?aRg=valuEEe&bloup=blap");

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

      done();
    });

    it('Should remove a trailing hash with its fragment except if it a #!', function (done) {
      var theUrl = "http://www.domain.tld/path/file.extension/#";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/path/file.extension");

      theUrl = "http://www.domain.tld/path/file.extension/#something";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/path/file.extension");

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

      theUrl = "http://www.domain.tld/path/file/#!bloup";
      normalizeUrl(theUrl).should.equal("http://www.domain.tld/path/file#!bloup");

      done();
    });

    it('Should lowercase the DNS part and keep the given path case', function (done) {
      var theUrl = "hTTp://subdOMaiN.dOmaIn.tLD/path/fiLE.exTENsion/";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/fiLE.exTENsion");

      done();
    });

    it('Should remove the port if it is 80, keep it otherwise', function (done) {
      var theUrl = "http://subdomain.domain.tld:80/path/file.extension/";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension");

      theUrl = "http://subdomain.domain.tld:99/path/file.extension/";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld:99/path/file.extension");

      done();
    });

    it('Remove a querystring if there are no arguments - it is only a "?"', function (done) {
      var theUrl = "http://subdomain.domain.tld/path/file.extension/?";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension");

      theUrl = "http://subdomain.domain.tld?";
      normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/");

      done();
    });

    it('Sort the arguments of a querystring and remove the useless ones for the querystring-fucking domains', function (done) {
      var theUrl = "http://www.youtube.com/path/file.extension/?arg=value&rtf=yto";
      normalizeUrl(theUrl).should.equal("http://www.youtube.com/path/file.extension?arg=value&rtf=yto");

      theUrl = "http://www.youtube.com/path/file.extension?eee=value&cd=yto";
      normalizeUrl(theUrl).should.equal("http://www.youtube.com/path/file.extension?cd=yto&eee=value");

      theUrl = "http://www.youtube.com/path/file.extension?caee=value&c5=yto";
      normalizeUrl(theUrl).should.equal("http://www.youtube.com/path/file.extension?c5=yto&caee=value");

      theUrl = "http://www.youtube.com/path/file.extension?zzzzz=value&yyyyy=yto&utm_source=a&utm_medium=b&utm_content=c&utm_campaign=d&utm_term=e";
      normalizeUrl(theUrl).should.equal("http://www.youtube.com/path/file.extension?yyyyy=yto&zzzzz=value");

      theUrl = "http://www.youtube.com/path/file.extension?caee=value&c5=yto&ffutm_sss=bloup&utma=b";  // Don't remove key of the utm_ is not the beginning of the string or the underscore is missing
      normalizeUrl(theUrl).should.equal("http://www.youtube.com/path/file.extension?c5=yto&caee=value&ffutm_sss=bloup&utma=b");

      done();
    });

    it('Remove a trailing slash if there is a path', function (done) {
      var theUrl = "http://www.youtube.com/path/file.extension/?arg=value&rtf=yto";
      normalizeUrl(theUrl).should.equal("http://www.youtube.com/path/file.extension?arg=value&rtf=yto");

      theUrl = "http://www.youtube.com/path/file/";
      normalizeUrl(theUrl).should.equal("http://www.youtube.com/path/file");

      done();
    });

    it('The normalize function should be idempotent', function (done) {
      var urlsToTest = [];

      // All the target urls in the tests above
      urlsToTest.push("http://domain.tld/path/file.extension");
      urlsToTest.push("https://domain.tld/path/file.extension");
      urlsToTest.push("http://domain.tld/");
      urlsToTest.push("http://subdomain.domain.tld/");
      urlsToTest.push("http://subdomain.domain.tld/bloup/blap");
      urlsToTest.push("http://www.youtube.com/?aRg=valuEEe");
      urlsToTest.push("http://www.youtube.com/?bloup=blap&eRg=valuEEe");
      urlsToTest.push("http://www.youtube.com/?aRg=valuEEe&bloup=blap");
      urlsToTest.push("http://domain.tld/");
      urlsToTest.push("http://domain.tld/");
      urlsToTest.push("http://subdomain.domain.tld/");
      urlsToTest.push("http://subdomain.domain.tld/");
      urlsToTest.push("http://www.domain.tld/path/file.extension");
      urlsToTest.push("http://www.domain.tld/path/file.extension");
      urlsToTest.push("http://www.domain.tld/path/file.extension");
      urlsToTest.push("http://www.domain.tld/path/file.extension");
      urlsToTest.push("http://www.domain.tld/");
      urlsToTest.push("http://www.domain.tld/");
      urlsToTest.push("http://www.domain.tld/");
      urlsToTest.push("http://www.domain.tld/");
      urlsToTest.push("http://www.domain.tld/#!bloup");
      urlsToTest.push("http://www.domain.tld/#!/path/to/somethingelse");
      urlsToTest.push("http://www.domain.tld/path#!bloup");
      urlsToTest.push("http://www.domain.tld/path/file#!bloup");
      urlsToTest.push("http://subdomain.domain.tld/path/fiLE.exTENsion");
      urlsToTest.push("http://subdomain.domain.tld/path/file.extension");
      urlsToTest.push("http://subdomain.domain.tld:99/path/file.extension");
      urlsToTest.push("http://subdomain.domain.tld/path/file.extension");
      urlsToTest.push("http://subdomain.domain.tld/");
      urlsToTest.push("http://www.youtube.com/path/file.extension?arg=value&rtf=yto");
      urlsToTest.push("http://www.youtube.com/path/file.extension?cd=yto&eee=value");
      urlsToTest.push("http://www.youtube.com/path/file.extension?c5=yto&caee=value");
      urlsToTest.push("http://www.youtube.com/path/file.extension?yyyyy=yto&zzzzz=value");
      urlsToTest.push("http://www.youtube.com/path/file.extension?c5=yto&caee=value&ffutm_sss=bloup&utma=b");
      urlsToTest.push("http://www.youtube.com/path/file.extension?arg=value&rtf=yto");
      urlsToTest.push("http://www.youtube.com/path/file");

      _.each(urlsToTest, function (theUrl) {
        normalizeUrl(theUrl).should.equal(theUrl);
      });

      done();
    });


  });   // ==== End of '#normalizeUrl' ==== //


});

