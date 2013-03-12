var server = {}
, User = require('./lib/models').User
, Credentials = require('./lib/models').Credentials
, config = require('./lib/config')
, DbObject = require('./lib/db')
, fs = require('fs')
, i;

db = new DbObject( config.dbHost
                  , config.dbName
                  , config.dbPort
                 );



db.connectToDatabase(function() {

 fs.open('export.csv', 'w+', function (err, id) {
   Credentials.find({type: 'google'})
              .populate('owner')
.exec(function(err,docs){
console.log('LENGHT', docs.length);

     for (i = 0; i < docs.length; i += 1) {
console.log('email', docs[i].owner ? docs[i].owner.email : docs[i]);
       fs.writeSync(id, docs[i].owner.email + ',' + docs[i].owner.username + '\n');
     }
fs.close(id, function(){
process.exit(0);
});
   });
 });

});
