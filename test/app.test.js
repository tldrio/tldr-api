const PORT = 3000;

process.env.NODE_ENV = 'test';
var APIeasy = require('api-easy');
var assert = require('assert');
var app = require('../app');
app.initServer();

var suite = APIeasy.describe('tldr-test')
    .use('localhost', PORT)
    .setHeader('Accept', 'application/json')
    .setHeader('Content-Type', 'application/json');

// sample tldr
var tldrTest = new app.tldrModel({
    _id: 1,
    clean_url: 'fnac.com/samere',
    summary: 'a shitty website',
    short_url: 'bit.ly/fnac',
    domain: 'fnac.com',
    source_author: 'PPR',
    source_title: 'Fnac Sa Mere', 
    source_published_at: '12/10/1990',
    summary_last_edited_at: '22/01/2012',
    summary_contributors: ['Charles', 'Stan'],
    tags: ['commerce','media'],
    view_counter: 0 
});

//Save to db
tldrTest.save(function(err){
    if(err){ throw err;}
    console.log('Tldr saved successfully');

});

// Start the server
suite.discuss('Starting the server...')
    .expect('Start server', function () {
        app.listen(PORT);
    }).next()
.undiscuss()

// Get a summary
.discuss('CRUD on tldrs')
    .path('/tldrs')
        .get('/')
            .expect(403)
        .get('/nonexistentsite.com')
            .expect(404)
        .get('/fnac.com/samere')
            .expect(200,tldrTest
            ) 
        .post(tldr)
            .expect(200, function (err, res, body) {
                assert.include(body, 'id');
            })            
.undiscuss()

// Export test for vows
.export(module)
