/**
 * URL normalization tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , User = models.User
  , Credentials = models.Credentials
  , i18n = require('../lib/i18n')
  , urlNormalization = require('../lib/urlNormalization')
  , Offenders = urlNormalization.Offenders
  , QuerystringOffenders = urlNormalization.QuerystringOffenders
  , normalizeUrl = urlNormalization.normalizeUrl
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async')
  ;


describe('Offenders', function () {
  var user;

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    function theRemove(Collection, cb) { Collection.remove({}, function () { cb(); }); }

    urlNormalization.querystringOffenders.resetCache();

    async.waterfall([
      async.apply(theRemove, User)
    , async.apply(theRemove, Credentials)
    , async.apply(theRemove, Tldr)
    , async.apply(theRemove, Offenders)
    , function (cb) {
        User.createAndSaveInstance({ email: 'valid@email.com', username: 'youpla', password: 'supersecret' }, function (err, _user) {
          user = _user;
          return cb();
        });
      }
    ], done);
  });


  it('Can add a querystring offender to both cache and database', function (done) {
    var qso = new QuerystringOffenders();

    Object.keys(qso.getCache()).length.should.equal(0);
    qso.addDomainToCacheAndDatabase('badboy.com', function () {
      Object.keys(qso.getCache()).length.should.equal(1);
      qso.getCache()['badboy.com'].significant.length.should.equal(0);

      Offenders.find({}, function (err, offenders) {
        offenders.length.should.equal(1);
        offenders[0].domainName.should.equal('badboy.com');

        done();
      });
    });
  });

  it('Can add a qso and specify his significant part', function (done) {
    var qso = new QuerystringOffenders();

    Object.keys(qso.getCache()).length.should.equal(0);
    qso.addDomainToCacheAndDatabase({ domainName: 'badboy.com', significant: ['whyinblazes', 'dontdothat'] }, function () {
      Object.keys(qso.getCache()).length.should.equal(1);
      qso.getCache()['badboy.com'].significant.length.should.equal(2);
      qso.getCache()['badboy.com'].significant.should.contain('whyinblazes');
      qso.getCache()['badboy.com'].significant.should.contain('dontdothat');

      Offenders.find({}, function (err, offenders) {
        offenders.length.should.equal(1);
        offenders[0].domainName.should.equal('badboy.com');
        offenders[0].significant.length.should.equal(2);
        offenders[0].significant.should.contain('whyinblazes');
        offenders[0].significant.should.contain('dontdothat');

        done();
      });
    });
  });

  it('Can reset the cache without changing the database', function (done) {
    var qso = new QuerystringOffenders();

    Object.keys(qso.getCache()).length.should.equal(0);
    qso.addDomainToCacheAndDatabase('badboy.com', function () {
      Object.keys(qso.getCache()).length.should.equal(1);
      qso.getCache()['badboy.com'].significant.length.should.equal(0);

      Offenders.find({}, function (err, offenders) {
        offenders.length.should.equal(1);
        offenders[0].domainName.should.equal('badboy.com');

        qso.resetCache();
        Object.keys(qso.getCache()).length.should.equal(0);

        // No change in the DB state
        Offenders.find({}, function (err, offenders) {
          offenders.length.should.equal(1);
          offenders[0].domainName.should.equal('badboy.com');

          done();
        });
      });
    });
  });

  it('Can update the cache from the database', function (done) {
    var qso = new QuerystringOffenders();

    Object.keys(qso.getCache()).length.should.equal(0);
    qso.addDomainToCacheAndDatabase('badboy.com', function () {
      qso.addDomainToCacheAndDatabase('another.com', function () {
        Object.keys(qso.getCache()).length.should.equal(2);
        qso.resetCache();
        Object.keys(qso.getCache()).length.should.equal(0);

        qso.updateCacheFromDatabase(function () {
          Object.keys(qso.getCache()).length.should.equal(2);
          qso.getCache()['badboy.com'].significant.length.should.equal(0);
          qso.getCache()['another.com'].significant.length.should.equal(0);

          done();
        });
      });
    });
  });

  it('If we asynchronously add a domain, the cache gets updated immediately even though the database doesnt', function () {
    var qso = new QuerystringOffenders();

    Object.keys(qso.getCache()).length.should.equal(0);
    qso.addDomainToCacheAndDatabase('badboy.com');
    Object.keys(qso.getCache()).length.should.equal(1);
    qso.getCache()['badboy.com'].significant.length.should.equal(0);
  });

  it('Can add the same domain multiple times without raising an error and keeping the docs unique', function (done) {
    var qso = new QuerystringOffenders();

    Object.keys(qso.getCache()).length.should.equal(0);
    qso.addDomainToCacheAndDatabase('badboy.com', function (err) {
      assert.isUndefined(err);
      Object.keys(qso.getCache()).length.should.equal(1);
      qso.getCache()['badboy.com'].significant.length.should.equal(0);

      Offenders.find({}, function (err, docs) {
        docs.length.should.equal(1);
        docs[0].domainName.should.equal('badboy.com');

        // No error and no change if we add it again
        qso.addDomainToCacheAndDatabase('badboy.com', function (err) {
          assert.isUndefined(err);
          Object.keys(qso.getCache()).length.should.equal(1);
          qso.getCache()['badboy.com'].significant.length.should.equal(0);

          Offenders.find({}, function (err, docs) {
            docs.length.should.equal(1);
            docs[0].domainName.should.equal('badboy.com');

            done();
          });
        });
      });
    });
  });

  it('handleQuerystringOffender can handle the fact that a tldr is a qso', function (done) {
      var tldrData = { title: 'Blog NFA'
                     , url: 'http://www.mydomain.com/article?var=value'
                     // The hostname is normalized
                     , summaryBullets: ['coin']
                     , imageUrl: 'http://google.com/image.png'
                     , articleWordCount: 437
                     }
        , tldr
        , qso = urlNormalization.querystringOffenders;

      async.waterfall([
      function (cb) {
        Object.keys(qso.getCache()).length.should.equal(0);
        Offenders.find({}, function (err, offenders) {
          offenders.length.should.equal(0);
          return cb();
        });
      }
      , function (cb) {
        Tldr.createAndSaveInstance(tldrData, user, function (err, _tldr) {
          tldr = _tldr;
          tldr.originalUrl.should.equal('http://www.mydomain.com/article?var=value');
          tldr.possibleUrls.length.should.equal(1);
          tldr.possibleUrls[0].should.equal('http://mydomain.com/article');

          urlNormalization.handleQuerystringOffender({ tldr: tldr }, function (err) {
            assert.isNull(err);
            Tldr.findOne({ _id: tldr._id }, function (err, tldr) {
              tldr.originalUrl.should.equal('http://www.mydomain.com/article?var=value');
              tldr.possibleUrls.length.should.equal(1);
              tldr.possibleUrls[0].should.equal('http://mydomain.com/article?var=value');

              return cb();
            });
          });
        });
      }
      , function (cb) {
        Object.keys(qso.getCache()).length.should.equal(1);
        qso.getCache()['mydomain.com'].significant.length.should.equal(0);
        Offenders.find({}, function (err, offenders) {
          offenders.length.should.equal(1);
          offenders[0].domainName.should.equal('mydomain.com');
          return cb();
        });
      }
      // If it has been done once, a new call to the handleQSO function shouldn't change anything
      , function (cb) {
        urlNormalization.handleQuerystringOffender({ tldr: tldr }, function (err) {
          assert.isNull(err);
          Tldr.findOne({ _id: tldr._id }, function (err, tldr) {
            tldr.originalUrl.should.equal('http://www.mydomain.com/article?var=value');
            tldr.possibleUrls.length.should.equal(1);
            tldr.possibleUrls[0].should.equal('http://mydomain.com/article?var=value');

            return cb();
          });
        });
      }
      , function (cb) {
        Object.keys(qso.getCache()).length.should.equal(1);
        qso.getCache()['mydomain.com'].significant.length.should.equal(0);
        Offenders.find({}, function (err, offenders) {
          offenders.length.should.equal(1);
          offenders[0].domainName.should.equal('mydomain.com');
          return cb();
        });
      }
      ], done);
  });

  it('handleQuerystringOffender can handle a new qso with a significant part', function (done) {
      var tldrData = { title: 'Blog NFA'
                     , url: 'http://www.mydomain.com/article?var=value&sig=yes'
                     // The hostname is normalized
                     , summaryBullets: ['coin']
                     , imageUrl: 'http://google.com/image.png'
                     , articleWordCount: 437
                     }
        , tldr
        , qso = urlNormalization.querystringOffenders;

      async.waterfall([
      function (cb) {
        Object.keys(qso.getCache()).length.should.equal(0);
        Offenders.find({}, function (err, offenders) {
          offenders.length.should.equal(0);
          return cb();
        });
      }
      , function (cb) {
        Tldr.createAndSaveInstance(tldrData, user, function (err, _tldr) {
          tldr = _tldr;
          tldr.originalUrl.should.equal('http://www.mydomain.com/article?var=value&sig=yes');
          tldr.possibleUrls.length.should.equal(1);
          tldr.possibleUrls[0].should.equal('http://mydomain.com/article');

          urlNormalization.handleQuerystringOffender({ tldr: tldr, significant: ['sig'] }, function (err) {
            assert.isNull(err);
            Tldr.findOne({ _id: tldr._id }, function (err, tldr) {
              tldr.originalUrl.should.equal('http://www.mydomain.com/article?var=value&sig=yes');
              tldr.possibleUrls.length.should.equal(1);
              tldr.possibleUrls[0].should.equal('http://mydomain.com/article?sig=yes');

              return cb();
            });
          });
        });
      }
      , function (cb) {
        Object.keys(qso.getCache()).length.should.equal(1);
        qso.getCache()['mydomain.com'].significant.length.should.equal(1);
        qso.getCache()['mydomain.com'].significant.should.contain('sig');
        Offenders.find({}, function (err, offenders) {
          offenders.length.should.equal(1);
          offenders[0].domainName.should.equal('mydomain.com');
          return cb();
        });
      }
      ], done);
  });


});


describe('#normalizeUrl', function() {

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    function theRemove(Collection, cb) { Collection.remove({}, function () { cb(); }); }

    urlNormalization.querystringOffenders.resetCache();
    theRemove(Offenders, function () {
      urlNormalization.querystringOffenders.addDomainToCacheAndDatabase('youtube.com', function () {
        urlNormalization.querystringOffenders.addDomainToCacheAndDatabase('news.ycombinator.com', function () {
          done();
        });
      });
    });
  });


  it('Should keep correctly formatted urls unchanged', function () {
    var theUrl = "http://domain.tld/path/file.extension";
    normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");

    theUrl = "http://domain.tld/path/file.extension";
    normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");
  });

  it('Should remove leading www subdomain, if any', function () {
    var theUrl = "http://domain.tld/path/file.extension";
    normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");

    theUrl = "http://subd.domain.tld/path/file.extension";
    normalizeUrl(theUrl).should.equal("http://subd.domain.tld/path/file.extension");

    theUrl = "http://www.domain.tld/path/file.extension";
    normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");

    // No problem with hostnames less than 4 characters
    theUrl = "http://d.t/path/file.extension";
    normalizeUrl(theUrl).should.equal("http://d.t/path/file.extension");
  });


  it('Should remove the querystring for non whitelisted websites', function () {
    var theUrl = "http://domain.tld/?aRg=valuEEe";
    normalizeUrl(theUrl).should.equal("http://domain.tld/");

    theUrl = "http://subdomain.domain.tld?arg=value";
    normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/");

    theUrl = "http://subdomain.domain.tld/bloup/blap?arg=value";
    normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/bloup/blap");
  });

  it('Should keep querystring for whitelisted domains but remove the utm ones and sort the remaining arguments', function () {
    var theUrl = "http://youtube.com/?aRg=valuEEe";
    normalizeUrl(theUrl).should.equal("http://youtube.com/?aRg=valuEEe");

    theUrl = "http://youtube.com/?eRg=valuEEe&bloup=blap";
    normalizeUrl(theUrl).should.equal("http://youtube.com/?bloup=blap&eRg=valuEEe");

    theUrl = "http://youtube.com/?aRg=valuEEe&bloup=blap&utm_grok=big";
    normalizeUrl(theUrl).should.equal("http://youtube.com/?aRg=valuEEe&bloup=blap");
  });

  it('Should keep correctly formatted urls with only domain/subdomain, adding a forgotten trailing slash', function () {
    var theUrl = "http://domain.tld/";
    normalizeUrl(theUrl).should.equal("http://domain.tld/");

    theUrl = "http://domain.tld";
    normalizeUrl(theUrl).should.equal("http://domain.tld/");

    theUrl = "http://subdomain.domain.tld/";
    normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/");

    theUrl = "http://subdomain.domain.tld";
    normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/");
  });

  it('Should remove a trailing hash with its fragment except if it a #!', function () {
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
  });

  it('Should lowercase the DNS part and keep the given path case', function () {
    var theUrl = "hTTp://subdOMaiN.dOmaIn.tLD/path/fiLE.exTENsion/";
    normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/fiLE.exTENsion");
  });

  it('Should remove the port if it is 80, keep it otherwise', function () {
    var theUrl = "http://subdomain.domain.tld:80/path/file.extension/";
    normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension");

    theUrl = "http://subdomain.domain.tld:99/path/file.extension/";
    normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld:99/path/file.extension");
  });

  it('Remove a querystring if there are no arguments - it is only a "?"', function () {
    var theUrl = "http://subdomain.domain.tld/path/file.extension/?";
    normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension");

    theUrl = "http://subdomain.domain.tld?";
    normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/");
  });

  it('Sort the arguments of a querystring and remove the useless ones for the querystring-fucking domains', function () {
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
  });

  it('Remove a trailing slash if there is a path', function () {
    var theUrl = "http://youtube.com/path/file.extension/?arg=value&rtf=yto";
    normalizeUrl(theUrl).should.equal("http://youtube.com/path/file.extension?arg=value&rtf=yto");

    theUrl = "http://youtube.com/path/file/";
    normalizeUrl(theUrl).should.equal("http://youtube.com/path/file");
  });

  it('Should remove slug from slug offending urls', function () {
    var theUrl = "http://stackoverflow.com/about/me/test";
    normalizeUrl(theUrl).should.equal("http://stackoverflow.com/about/me/test");

    theUrl = "http://stackoverflow.com/questions/meh/slug";
    normalizeUrl(theUrl).should.equal("http://stackoverflow.com/questions/meh/slug");

    theUrl = "http://stackoverflow.com/questions/641203483/slug";
    normalizeUrl(theUrl).should.equal("http://stackoverflow.com/questions/641203483");

    theUrl = "http://stackoverflow.com/questions/641203483/slug/";
    normalizeUrl(theUrl).should.equal("http://stackoverflow.com/questions/641203483");

    theUrl = "http://stackoverflow.com/questions/641203483/slug/again";
    normalizeUrl(theUrl).should.equal("http://stackoverflow.com/questions/641203483");

    theUrl = "http://stackoverflow.com/questions/641203483/";
    normalizeUrl(theUrl).should.equal("http://stackoverflow.com/questions/641203483");

    theUrl = "http://stackoverflow.com/questions/641203483";
    normalizeUrl(theUrl).should.equal("http://stackoverflow.com/questions/641203483");
  });

  it('Should use only one tld for blogsport urls', function () {
    var theUrl = "http://bloup.blogspot.com/about/me";
    normalizeUrl(theUrl).should.equal("http://bloup.blogspot.com/about/me");

    theUrl = "http://bloup.blogspot.fr/about/me";
    normalizeUrl(theUrl).should.equal("http://bloup.blogspot.com/about/me");

    theUrl = "http://bloup.blogspot.co.uk/about/me";
    normalizeUrl(theUrl).should.equal("http://bloup.blogspot.com/about/me");

    theUrl = "http://bloup.blogspot.com.au/about/me";
    normalizeUrl(theUrl).should.equal("http://bloup.blogspot.com/about/me");
  });

  it('Should always use http, since nobody hosts a different site on https', function () {
    var theUrl;

    theUrl = "https://lemonde.fr/about/me";
    normalizeUrl(theUrl).should.equal("http://lemonde.fr/about/me");
  });

  it('Should be able to update the querystring offenders and work synchronously with them', function () {
    var theUrl;

    theUrl = "http://lemonde.fr/about/me?var=value";
    normalizeUrl(theUrl).should.equal("http://lemonde.fr/about/me");

    urlNormalization.querystringOffenders.addDomainToCacheAndDatabase('lemonde.fr');

    theUrl = "http://lemonde.fr/about/me?var=value";
    normalizeUrl(theUrl).should.equal("http://lemonde.fr/about/me?var=value");
  });

  it('The normalize function should be idempotent', function () {
    var urlsToTest = [];

    // All the target urls in the tests above
    urlsToTest.push("http://domain.tld/path/file.extension");
    urlsToTest.push("http://domain.tld/path/file.extension");
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
    urlsToTest.push("http://lemonde.fr/about/me");

    _.each(urlsToTest, function (theUrl) {
      normalizeUrl(theUrl).should.equal(theUrl);
    });
  });

});   // ==== End of '#normalizeUrl' ==== //
