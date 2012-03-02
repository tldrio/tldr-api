
/**
 * Module dependencies.
 */

var express = require('express')
   ,routes = require('./routes')
   ,models = require('./models')
   , mongoose = require('mongoose');
var db;

//var app = module.exports = express.createServer();


/*
 * Configuration
 */
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

/* Application environment configuration */
app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
    app.set('db-name', 'dataStore-dev');
});

app.configure('test', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
    app.set('db-name', 'dataStore-test');
});

app.configure('production', function(){
    app.use(express.errorHandler()); 
    app.set('db-name', 'dataStore-prod');
});

/*
 * Connect to Mongoose and load connection to tldr collection
 */
function initServer(){
    models.defineModels(mongoose, function(){
         /* Callback after calling define Models
            Load define Models */
        app.tldrModel = mongoose.model('tldr');
        app.userModel = mongoose.model('user');
        db = mongoose.connect('mongodb://localhost/'+app.set('db-name'), function(err) {
          if (err) { throw err; }
        });
    });
}


//module.exports.initServer = initServer;
module.exports = function(){
    
    return{
        express.createServer();
    }
};
/*
 * Routing
 */

app.get('/',routes.index);

app.get('/tldrs/', function (req, res) {
    res.send(403);
});
app.get('/tldrs/:id', function(req, res){
    var id = req.params.id;
    console.log("Querying summary id " + id);
    var tldr = app.tldrModel.find({_id:id}, function (err, elts){
        var length = elts.length;
        if(length)
            res.send(elts[0],200);
        else
            res.send(404);
    });
});

app.get('/*', function (req, res) {
    res.send(404);
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
