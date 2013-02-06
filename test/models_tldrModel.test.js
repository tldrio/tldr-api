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
  , Credentials = models.Credentials
  , User = models.User
  , TldrHistory = models.TldrHistory
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , url = require('url')
  , async = require('async')
  , notificator = require('../lib/notificator')
  ;


// Version of setTimeout usable with async.apply
// Used to integration test parts using the message queue
function wait (millis, cb) {
  setTimeout(cb, millis);
}


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
    Credentials.remove({}, function(err) {
      User.remove({}, function(err) {
        Tldr.remove({}, function (err) {
          User.createAndSaveInstance({ username: "eeee", password: "eeeeeeee", email: "valid@email.com", twitterHandle: 'zetwit' }, function(err, _user) {
            user = _user;
            done();
          });
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

        _.keys(err.errors).length.should.equal(3);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.url.should.not.equal(null);
        valErr.originalUrl.should.not.equal(null);

        done();
      });
    });

    it('should detect missing required title arg', function (done) {
      var tldrData = {
        url: 'http://bloup.com/',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
      }
      , valErr;

      Tldr.createAndSaveInstance( tldrData, user, function (err, tldr) {
        err.name.should.equal('ValidationError');
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.title.should.not.equal(undefined);

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

          _.keys(err.errors).length.should.equal(2);
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

    it('should reject a title thats too long', function (done) {

      var tldrData = {
          url: 'http://needforair.com/nutcrackers',
          title: 'Blog Blog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmBlog NFAmmuNFAmm',   // 201 characters
          resourceAuthor: 'NFA Crew',
          summaryBullets: ['bloup']
          }
        , valErr;

      Tldr.createAndSaveInstance(tldrData, user, function (err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.title.should.not.equal(null);

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

  });   // ==== End of '#validators' ==== //


  describe('#createAndSaveInstance', function () {

    it('should allow user to set url, title, summary, resourceAuthor and imageUrl only', function (done) {
      var tldrData = { title: 'Blog NFAerBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAerrrrrrrrrrrrrrrrrrr'
        , url: 'http://mydomain.com'
        , summaryBullets: ['coin']
        , resourceAuthor: 'bloup'
        , createdAt: '2012'
        , imageUrl: 'http://google.com/image.png'
        };

      Tldr.createAndSaveInstance(tldrData, user, function (err) {
          if (err) { return done(err); }
          Tldr.find({resourceAuthor: 'bloup'}, function (err,docs) {
            if (err) { return done(err); }

            var tldr = docs[0];
            tldr.url.should.equal('http://mydomain.com/');
            tldr.summaryBullets.should.include('coin');
            tldr.resourceAuthor.should.equal('bloup');
            tldr.imageUrl.should.equal('http://google.com/image.png');
            tldr.createdAt.should.not.equal('2012');

            done();
          });
        });
    });

    it('Should initialize the array of possible urls by the url used for creating this tldr', function (done) {
      var tldrData = { title: 'Blog NFAerBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAeBlog NFAerrrrrrrrrrrrrrrrrrr'
        , url: 'http://www.mydomain.com/bloup/'
        , summaryBullets: ['coin']
        , resourceAuthor: 'bloup'
        , createdAt: '2012'
        , imageUrl: 'http://google.com/image.png'
        };

      Tldr.createAndSaveInstance(tldrData, user, function (err) {
          if (err) { return done(err); }
          Tldr.find({resourceAuthor: 'bloup'}, function (err,docs) {
            if (err) { return done(err); }

            var tldr = docs[0];
            tldr.possibleUrls.length.should.equal(1);
            tldr.possibleUrls[0].should.equal(tldr.url);

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
            Tldr.find({possibleUrls: tldr.url}, function (err,docs) {
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

    it('should automatically set required hostname', function (done) {
      var tldrData = {
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
        url: 'http://needforair.com',
      }
      , valErr;

      Tldr.createAndSaveInstance( tldrData, user, function (err, tldr) {
        if (err) { return done(err); }
        Tldr.find({possibleUrls:  'http://needforair.com/'}, function (err, docs) {
          if (err) { return done(err); }
          docs[0].hostname.should.equal('needforair.com');
          done();
        });
      });
    });

    it('Should set discoverable to true automatically', function (done) {
      var tldrData = {
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
        url: 'http://needforair.com',
      };

      Tldr.createAndSaveInstance( tldrData, user, function (err, tldr) {
        if (err) { return done(err); }
        tldr.discoverable.should.equal(true);
        done();
      });
    });

    it('Should not crash because no title was provided', function (done) {
      var tldrData1 = {
            summaryBullets: ['Awesome Blog'],
            resourceAuthor: 'NFA Crew',
            url: 'http://needforair.com',
          }
        , tldrData2 = { title: ''
                      , summaryBullets: ['hgf']
                      , url: 'http://needforair.com/yup'
          }
        ;

      Tldr.createAndSaveInstance(tldrData1, user, function (err, tldr1) {
        assert.isDefined(models.getAllValidationErrorsWithExplanations(err.errors).title);

        Tldr.createAndSaveInstance(tldrData2, user, function (err, tldr2) {
          assert.isDefined(models.getAllValidationErrorsWithExplanations(err.errors).title);

          done();
        });
      });
    });

    it('should automatically set virtual slug', function (done) {
      var tldrData = {
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
        url: 'http://needforair.com',
      }
      , valErr;

      Tldr.createAndSaveInstance(tldrData, user, function (err, tldr) {
        if (err) { return done(err); }
        tldr.slug.should.equal('blog-nfa');
        Tldr.find({possibleUrls:  'http://needforair.com/'}, function (err, docs) {
          if (err) { return done(err); }
          docs[0].slug.should.equal('blog-nfa');
          done();
        });
      });
    });


  });   // ==== End of '#createAndSaveInstance' ==== //


  describe('find by url', function () {

    it('findOneByUrl should be able to find a tldr by a normalized or non normalized url', function (done) {
      var tldrData = {
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
        url: 'http://needforair.com',
      }
      , id
      ;

      Tldr.createAndSaveInstance(tldrData, user, function (err, tldr) {
        id = tldr._id;
        async.waterfall([
          function (cb) {
            Tldr.findOneByUrl('http://needforair.com', function (err, tldr) {
              tldr._id.toString().should.equal(id.toString());
              cb();
            });
          }
        , function (cb) {
            Tldr.findOneByUrl('http://www.needforair.com', function (err, tldr) {
              tldr._id.toString().should.equal(id.toString());
              tldr.possibleUrls.push('http://bloup.com/bim');
              tldr.save(function (err, tldr) { cb(); });
            });
          }
        , function (cb) {
            Tldr.findOneByUrl('http://bloup.com/bim', function (err, tldr) {
              tldr._id.toString().should.equal(id.toString());
              cb();
            });
          }
        , function (cb) {
            Tldr.findOneByUrl('http://www.bloup.com/bim', function (err, tldr) {
              tldr._id.toString().should.equal(id.toString());
              cb();
            });
          }
        ], done);
      });
    });

    it('findOneByUrl should populate the creator\'s username and twitterHandle', function (done) {
      var tldrData = {
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
        url: 'http://needforair.com',
      }
      , id
      ;

      Tldr.createAndSaveInstance(tldrData, user, function (err, tldr) {
        id = tldr._id;
        Tldr.findOneByUrl('http://needforair.com', function (err, tldr) {
          tldr._id.toString().should.equal(id.toString());
          tldr.creator.username.should.equal('eeee');
          tldr.creator.twitterHandle.should.equal('zetwit');
          done();
        });
      });
    });

    it('findOneByUrl and findOneById called should result in an increase of the weekly and total read counts', function (done) {
      var tldrData = {
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
        url: 'http://needforair.com',
      }
      , id
      , prevReadCount, prevWeeklyReadCount
      ;

      async.waterfall([
        function (cb) {
          Tldr.createAndSaveInstance(tldrData, user, function (err, tldr) {
            id = tldr._id;
            prevReadCount = tldr.readCount;
            prevWeeklyReadCount = tldr.readCountThisWeek;
            cb();
          });
        }
      , function (cb) {
          Tldr.findOneByUrl('http://needforair.com', function () { cb(); });
        }
      , async.apply(wait, 20)   // Give time for the message queue to do its job
      , function (cb) {
          Tldr.findOne({ _id: id }, function (err, tldr) {
            tldr.readCount.should.equal(prevReadCount + 1);
            tldr.readCountThisWeek.should.equal(prevWeeklyReadCount + 1);
            cb();
          });
        }
      , function (cb) {
          Tldr.findOneById(id, function () { cb(); });
        }
      , async.apply(wait, 20)   // Give time for the message queue to do its job
      , function (cb) {
          Tldr.findOne({ _id: id }, function (err, tldr) {
            tldr.readCount.should.equal(prevReadCount + 2);
            tldr.readCountThisWeek.should.equal(prevWeeklyReadCount + 2);
            cb();
          });
        }
      ], done);
    });


  });   // ==== End of 'find by url' ==== //


  describe('Redirection and canonicalization handling', function () {

    it('If a tldr exist with the to url, redirection should add the from as a possible url', function (done) {
      var tldrData = {
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
        url: 'http://needforair.com',
      }
      , id
      ;

      Tldr.createAndSaveInstance(tldrData, user, function (err, tldr) {
        id = tldr._id;
        Tldr.registerRedirection('http://bloups.com/bam', 'http://needforair.com', function () {
          Tldr.findOneByUrl('http://bloups.com/bam', function (err, tldr) {
            tldr._id.toString().should.equal(id.toString());
            done();
          });
        });
      });
    });

  });   // ==== End of 'Redirection and canonicalization handling' ==== //


  describe('discoverable and moderated', function () {

    it('Should make a tldr undiscoverable', function (done) {
      var tldrData = {
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
        url: 'http://needforair.com',
      };

      Tldr.createAndSaveInstance( tldrData, user, function (err, tldr) {
        if (err) { return done(err); }
        tldr.discoverable.should.equal(true);

        Tldr.makeUndiscoverable(tldr._id, function (err, numAffected) {
          numAffected.should.equal(1);

          Tldr.findOne({ _id: tldr._id }, function (err, theTldr) {
            theTldr.discoverable.should.equal(false);

            done();
          });
        });
      });
    });

    it('Should moderate a tldr', function (done) {
      var tldrData = {
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
        url: 'http://needforair.com',
      };

      Tldr.createAndSaveInstance( tldrData, user, function (err, tldr) {
        if (err) { return done(err); }
        tldr.moderated.should.equal(false);

        Tldr.moderateTldr(tldr._id, function (err, numAffected) {
          numAffected.should.equal(1);

          Tldr.findOne({ _id: tldr._id }, function (err, theTldr) {
            theTldr.moderated.should.equal(true);

            done();
          });
        });
      });
    });

  });   // ==== End of 'discoverable and moderated' ==== //


  describe('#updateValidFields', function () {

    it('should restrict the fields the user is allowed to update', function (done) {
        var updated = {url: 'http://myotherdomain.com'
                      , summaryBullets: ['new2']
                      , title: 'Blog NeedForAir'
                      , resourceAuthor: 'new3'
                      , createdAt: '2012'
                      , imageUrl: 'http://g.com/second.png'
                      }
          , tldrData = { title: 'Blog NFA'
                       , url: 'http://mydomain.com'
                       , summaryBullets: ['coin']
                       , resourceAuthor: 'bloup'
                       , imageUrl: 'http://g.com/first.png'
                       };

      Tldr.createAndSaveInstance(tldrData, user, function(err) {
          if (err) { return done(err); }
          Tldr.find({resourceAuthor: 'bloup'}, function (err,docs) {
            if (err) { return done(err); }

            var tldr = docs[0];
            tldr.url.should.equal('http://mydomain.com/');
            tldr.summaryBullets.should.include('coin');
            tldr.title.should.equal('Blog NFA');
            tldr.resourceAuthor.should.equal('bloup');
            tldr.imageUrl.should.equal('http://g.com/first.png');

            // Perform update
            tldr.updateValidFields(updated, user, function(err) {
              if (err) { return done(err); }

              tldr.url.should.equal('http://mydomain.com/');
              tldr.summaryBullets.should.include('new2');
              tldr.title.should.equal('Blog NeedForAir');
              tldr.resourceAuthor.should.equal('new3');
              tldr.createdAt.should.not.equal('2012');
              tldr.imageUrl.should.equal('http://g.com/first.png');

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


  describe('#updateBatch', function () {

    it('should proceed to a batch update giving an array of url', function (done) {
      var tldrData1 = { title: 'Blog NFA'
                     , url: 'http://mydomain.com/'
                     , summaryBullets: ['coin']
                     , resourceAuthor: 'bloup'}
        , tldrData2 = { title: 'Blog NFA - Totot'
                     , url: 'http://anotherdomain.com/'
                     , summaryBullets: ['coin']
                     , resourceAuthor: 'bloup'}
        , tldrData3 = { title: 'Blog NFA - tata'
                     , url: 'http://athirddomain.com/'
                     , summaryBullets: ['coin']
                     , resourceAuthor: 'bloup'}
        , batch = [tldrData1.url, tldrData2.url, 'http://nonexistingdomain.com/']
        , prevReadCount1
        , prevReadCount2;

      Tldr.createAndSaveInstance(tldrData1, user, function (err, tldr) {
        prevReadCount1 = tldr.readCount;
        Tldr.createAndSaveInstance(tldrData2, user, function (err, tldr) {
          prevReadCount2 = tldr.readCount;
          Tldr.createAndSaveInstance(tldrData3, user, function (err, tldr) {
            Tldr.updateBatch(batch , { $inc: { readCount: 1 } }, function (err, num, raw) {
              if (err) { return done(err); }
              num.should.equal(2);
              Tldr.find({ possibleUrls: tldrData1.url }, function (err, tldr) {
                tldr[0].readCount.should.equal(prevReadCount1 + 1);
                Tldr.find({ possibleUrls: tldrData2.url }, function (err, tldr) {
                  tldr[0].readCount.should.equal(prevReadCount2 + 1);
                  done();
                });
              });
            });
          });
        });
      });
    });

  });


  describe('XSS prevention and user input cleaning and decoding', function () {

    it('Should sanitize user generated fields when creating a tldr with createAndSaveInstance', function (done) {
      var userInput = {
          url: 'http://needfdocument.cookieorair.com/nutcrackers',
          title: 'Blog NFdocument.writeA',
          summaryBullets: ['Aweso.parentNodeme Blog', 'B.innerHTMLloup'],
          resourceAuthor: 'NFA Crewwindow.location',
          resourceDate: '2012',
          imageUrl: 'http://googledocument.write.fr/bloup.png'
          };

      Tldr.createAndSaveInstance(userInput, user, function (err, theTldr) {
        assert.isNull(err, 'no errors');
        theTldr.url.should.equal('http://needforair.com/nutcrackers');
        theTldr.originalUrl.should.equal('http://needforair.com/nutcrackers');
        theTldr.title.should.equal('Blog NFA');
        theTldr.summaryBullets[0].should.equal('Awesome Blog');
        theTldr.summaryBullets[1].should.equal('Bloup');
        theTldr.resourceAuthor.should.equal('NFA Crew');
        theTldr.imageUrl.should.equal('http://google.fr/bloup.png');
        theTldr.possibleUrls.length.should.equal(1);
        theTldr.possibleUrls[0].should.equal('http://needforair.com/nutcrackers');

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
          theTldr.originalUrl.should.equal('http://url.com/nutcrackers');   // originalUrl is not updatable
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
          };

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
        // We can test against the regular '<' character
        doc.summaryBullets[1].should.equal( 'tit<i');

        // We need to use the unicode escape here because this is not a regular space but a non breakable space
        doc.title.should.equal('toto\u00a0titi');
        done();
      });
    });

  });   // ==== End of 'XSS prevention and user input cleaning and decoding' ==== //


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

  });   // ==== End of 'history management' ==== //


});
