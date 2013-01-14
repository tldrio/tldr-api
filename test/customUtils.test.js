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

    it('Should remove leading www subdomain, if any', function (done) {
      var theUrl = "http://domain.tld/path/file.extension";
      normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");

      theUrl = "http://subd.domain.tld/path/file.extension";
      normalizeUrl(theUrl).should.equal("http://subd.domain.tld/path/file.extension");

      theUrl = "http://www.domain.tld/path/file.extension";
      normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");

      // No problem with hostnames less than 4 characters
      theUrl = "http://d.t/path/file.extension";
      normalizeUrl(theUrl).should.equal("http://d.t/path/file.extension");

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
      var theUrl = "http://youtube.com/?aRg=valuEEe";
      normalizeUrl(theUrl).should.equal("http://youtube.com/?aRg=valuEEe");

      theUrl = "http://youtube.com/?eRg=valuEEe&bloup=blap";
      normalizeUrl(theUrl).should.equal("http://youtube.com/?bloup=blap&eRg=valuEEe");

      theUrl = "http://youtube.com/?aRg=valuEEe&bloup=blap&utm_grok=big";
      normalizeUrl(theUrl).should.equal("http://youtube.com/?aRg=valuEEe&bloup=blap");

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
      var theUrl = "http://domain.tld/path/file.extension/#";
      normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");

      theUrl = "http://domain.tld/path/file.extension/#something";
      normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");

      theUrl = "http://domain.tld/path/file.extension#";
      normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");

      theUrl = "http://domain.tld/path/file.extension#something";
      normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");

      theUrl = "http://domain.tld/#";
      normalizeUrl(theUrl).should.equal("http://domain.tld/");

      theUrl = "http://domain.tld/#something";
      normalizeUrl(theUrl).should.equal("http://domain.tld/");

      theUrl = "http://domain.tld#";
      normalizeUrl(theUrl).should.equal("http://domain.tld/");

      theUrl = "http://domain.tld#something";
      normalizeUrl(theUrl).should.equal("http://domain.tld/");

      theUrl = "http://domain.tld/#!bloup";
      normalizeUrl(theUrl).should.equal("http://domain.tld/#!bloup");

      theUrl = "http://domain.tld/#!/path/to/somethingelse";
      normalizeUrl(theUrl).should.equal("http://domain.tld/#!/path/to/somethingelse");

      theUrl = "http://domain.tld/path#!bloup";
      normalizeUrl(theUrl).should.equal("http://domain.tld/path#!bloup");

      theUrl = "http://domain.tld/path/file/#!bloup";
      normalizeUrl(theUrl).should.equal("http://domain.tld/path/file#!bloup");

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
      var theUrl = "http://youtube.com/path/file.extension/?arg=value&rtf=yto";
      normalizeUrl(theUrl).should.equal("http://youtube.com/path/file.extension?arg=value&rtf=yto");

      theUrl = "http://youtube.com/path/file.extension?eee=value&cd=yto";
      normalizeUrl(theUrl).should.equal("http://youtube.com/path/file.extension?cd=yto&eee=value");

      theUrl = "http://youtube.com/path/file.extension?caee=value&c5=yto";
      normalizeUrl(theUrl).should.equal("http://youtube.com/path/file.extension?c5=yto&caee=value");

      theUrl = "http://youtube.com/path/file.extension?zzzzz=value&yyyyy=yto&utm_source=a&utm_medium=b&utm_content=c&utm_campaign=d&utm_term=e";
      normalizeUrl(theUrl).should.equal("http://youtube.com/path/file.extension?yyyyy=yto&zzzzz=value");

      // Still be querystring-aware event if original url has a www that has been removed
      theUrl = "http://www.youtube.com/path/file.extension?caee=value&c5=yto&ffutm_sss=bloup&utma=b";  // Don't remove key of the utm_ is not the beginning of the string or the underscore is missing
      normalizeUrl(theUrl).should.equal("http://youtube.com/path/file.extension?c5=yto&caee=value&ffutm_sss=bloup&utma=b");

      // Work well with non-www subdomains
      theUrl = "http://news.ycombinator.com/path/file.extension?caee=value&c5=yto";
      normalizeUrl(theUrl).should.equal("http://news.ycombinator.com/path/file.extension?c5=yto&caee=value");

      done();
    });

    it('Remove a trailing slash if there is a path', function (done) {
      var theUrl = "http://youtube.com/path/file.extension/?arg=value&rtf=yto";
      normalizeUrl(theUrl).should.equal("http://youtube.com/path/file.extension?arg=value&rtf=yto");

      theUrl = "http://youtube.com/path/file/";
      normalizeUrl(theUrl).should.equal("http://youtube.com/path/file");

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
      urlsToTest.push("http://youtube.com/?aRg=valuEEe");
      urlsToTest.push("http://youtube.com/?bloup=blap&eRg=valuEEe");
      urlsToTest.push("http://youtube.com/?aRg=valuEEe&bloup=blap");
      urlsToTest.push("http://domain.tld/");
      urlsToTest.push("http://domain.tld/");
      urlsToTest.push("http://subdomain.domain.tld/");
      urlsToTest.push("http://subdomain.domain.tld/");
      urlsToTest.push("http://domain.tld/path/file.extension");
      urlsToTest.push("http://domain.tld/path/file.extension");
      urlsToTest.push("http://domain.tld/path/file.extension");
      urlsToTest.push("http://domain.tld/path/file.extension");
      urlsToTest.push("http://domain.tld/");
      urlsToTest.push("http://domain.tld/");
      urlsToTest.push("http://domain.tld/");
      urlsToTest.push("http://domain.tld/");
      urlsToTest.push("http://domain.tld/#!bloup");
      urlsToTest.push("http://domain.tld/#!/path/to/somethingelse");
      urlsToTest.push("http://domain.tld/path#!bloup");
      urlsToTest.push("http://domain.tld/path/file#!bloup");
      urlsToTest.push("http://subdomain.domain.tld/path/fiLE.exTENsion");
      urlsToTest.push("http://subdomain.domain.tld/path/file.extension");
      urlsToTest.push("http://subdomain.domain.tld:99/path/file.extension");
      urlsToTest.push("http://subdomain.domain.tld/path/file.extension");
      urlsToTest.push("http://subdomain.domain.tld/");
      urlsToTest.push("http://youtube.com/path/file.extension?arg=value&rtf=yto");
      urlsToTest.push("http://youtube.com/path/file.extension?cd=yto&eee=value");
      urlsToTest.push("http://youtube.com/path/file.extension?c5=yto&caee=value");
      urlsToTest.push("http://youtube.com/path/file.extension?yyyyy=yto&zzzzz=value");
      urlsToTest.push("http://youtube.com/path/file.extension?c5=yto&caee=value&ffutm_sss=bloup&utma=b");
      urlsToTest.push("http://youtube.com/path/file.extension?arg=value&rtf=yto");
      urlsToTest.push("http://youtube.com/path/file");

      _.each(urlsToTest, function (theUrl) {
        normalizeUrl(theUrl).should.equal(theUrl);
      });

      done();
    });


  });   // ==== End of '#normalizeUrl' ==== //


  describe('Slugification', function () {

    it('Should lowercase all upper case letter', function (done) {
      var input;

      input = "SalUT";
      customUtils.slugify(input).should.equal("salut");

      done();
    });

    it('Should replace non English characters by English ones', function (done) {
      var input;

      input = "ééèêëẽáàâäãúùûüũíìîïĩóòôöõýỳŷÿỹ";
      customUtils.slugify(input).should.equal("eeeeeeaaaaauuuuuiiiiioooooyyyyy");

      done();
    });

    it('Should use only a dash as delimiter', function (done) {
      var input;

      input = "Salut/ca\\farte_fourte-firte";
      customUtils.slugify(input).should.equal("salut-ca-farte-fourte-firte");

      done();
    });

    it('Should remove all unexpected characters', function (done) {
      var input;

      input = "Salut ca farte??? 145 fois";
      customUtils.slugify(input).should.equal("salut-ca-farte-145-fois");

      input = "lemonde.fr et,la;ca va";
      customUtils.slugify(input).should.equal("lemonde-fr-et-la-ca-va");

      done();
    });

    it('Should collapse multiple successive dash into only one', function (done) {
      var input;

      input = "Salut   ca farte - hn.com";
      customUtils.slugify(input).should.equal("salut-ca-farte-hn-com");

      done();
    });


  });   // ==== End of 'Slugification' ==== //


  describe('#arrayify', function () {

    it('Should return an empty array if given an empty object', function (done) {
      customUtils.arrayify({}).length.should.equal(0);
      done();
    });

    it('Should transform an object in an array of { key, value } and preserve types', function (done) {
      var obj = { bloup: 'blap'
                , clic: 5
                , grass: false }
        , res = customUtils.arrayify(obj);

      res[0].key.should.equal('bloup');
      res[1].key.should.equal('clic');
      res[2].key.should.equal('grass');

      res[0].value.should.equal('blap');
      res[1].value.should.equal(5);
      res[2].value.should.equal(false);

      done();
    });

  });   // ==== End of '#arrayify' ==== //


  describe('#upsertKVInArray', function () {

    it('Should not touch the array if key or value is missing', function (done) {
      var a = [
                { key: 'k1', value: 'v1' }
              , { key: 'k2', value: 'v2' }
              , { key: 'k3', value: 'v3' }
              ];

      a = customUtils.upsertKVInArray(a, 'bloup');
      a[0].key.should.equal('k1');
      a[1].key.should.equal('k2');
      a[2].key.should.equal('k3');
      a[0].value.should.equal('v1');
      a[1].value.should.equal('v2');
      a[2].value.should.equal('v3');

      a = customUtils.upsertKVInArray(a, null, 'bloup');
      a[0].key.should.equal('k1');
      a[1].key.should.equal('k2');
      a[2].key.should.equal('k3');
      a[0].value.should.equal('v1');
      a[1].value.should.equal('v2');
      a[2].value.should.equal('v3');

      done();
    });

    it('Should update the key if it exists', function (done) {
      var a = [
                { key: 'k1', value: 'v1' }
              , { key: 'k2', value: 'v2' }
              , { key: 'k3', value: 'v3' }
              ];

      a = customUtils.upsertKVInArray(a, 'k2', 'bloup');
      a[0].key.should.equal('k1');
      a[1].key.should.equal('k2');
      a[2].key.should.equal('k3');
      a[0].value.should.equal('v1');
      a[1].value.should.equal('bloup');
      a[2].value.should.equal('v3');

      done();
    });

    it('Should add the key if it doesnt exist', function (done) {
      var a = [
                { key: 'k1', value: 'v1' }
              , { key: 'k2', value: 'v2' }
              , { key: 'k3', value: 'v3' }
              ];

      a = customUtils.upsertKVInArray(a, 'kk', 'bloup');
      a[0].key.should.equal('k1');
      a[1].key.should.equal('k2');
      a[2].key.should.equal('k3');
      a[3].key.should.equal('kk');
      a[0].value.should.equal('v1');
      a[1].value.should.equal('v2');
      a[2].value.should.equal('v3');
      a[3].value.should.equal('bloup');

      done();
    });

    it('An empty string is not an empty value', function (done) {
      var a = [
                { key: 'k1', value: 'v1' }
              , { key: 'k2', value: 'v2' }
              , { key: 'k3', value: 'v3' }
              ];

      a = customUtils.upsertKVInArray(a, 'kk', '');
      a[0].key.should.equal('k1');
      a[1].key.should.equal('k2');
      a[2].key.should.equal('k3');
      a[3].key.should.equal('kk');
      a[0].value.should.equal('v1');
      a[1].value.should.equal('v2');
      a[2].value.should.equal('v3');
      a[3].value.should.equal('');

      done();
    });

  });   // ==== End of '#upsertKVInArray' ==== //



});

