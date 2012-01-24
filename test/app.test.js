const PORT = 3000;

var APIeasy = require('api-easy');
var assert = require('assert');
var app = require('../app');

var suite = APIeasy.describe('tldr-test')
    .use('localhost', PORT)
    .setHeader('Accept', 'application/json')
    .setHeader('Content-Type', 'application/json')

var tldr = { url: "www.fnac.com",
             summary: "shitty store"};

// Start the server
.discuss('Starting the server...')
    .expect('Start server', function () {
        app.listen(PORT);
    }).next()
.undiscuss()

// Get a summary
.discuss('CRUD on tldrs')
    .path('/tldrs')
        .get('/')
            .expect(403)
        .get('/2354409435')
            .expect(404)
        .get('/1')
            .expect(200,{_id:1 ,
                    url:"www.google.fr",
                    summary: "toto"
            }) 
        .post(tldr)
            .expect(200, function (err, res, body) {
                
            
.undiscuss()

// Export test for vows
.export(module)
