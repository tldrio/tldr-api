var bunyan = require('./lib/logger').bunyan
	, fs = require('fs')
  , env = {}      // Stores environment related data
	, contentOfFile // Following variables are for the remote connection informations
	, dbInfo
	, ipAddress
	, port
	, user
	, pwd;


// Define environment
// Default environment is development
env.name = process.env.TLDR_ENV || 'development';
bunyan.info("Environment set to %s", env.name);

// Corresponds to environment='development', no "if" to ensure variables are always set
env.databaseHost = 'localhost';
env.databasePort = '27017';
env.databaseName = 'dev-db';

if (env.name === 'test') {
  env.databaseHost = 'localhost';
  env.databasePort = '27017';
  env.databaseName = 'test-db';
}

if (env.name === 'remote') {
	// yodawg.info contains infos in the following format
	// ipAddress port user pwd
	// separator is just a space
	contentOfFile = fs.readFileSync('./yodawg.info', 'utf8'); 
	dbInfo = contentOfFile.split(' ');
	ipAddress = dbInfo[0];
	port = dbInfo[1];
	user = dbInfo[2];
	pwd = dbInfo[3];
  env.databaseHost = user+ ':' + pwd + '@' + ipAddress;
  env.databasePort = parseInt(port, 10);
  env.databaseName = 'remote-db'; 
}

if (env.name === 'production') {
  env.databaseHost = 'localhost';
  env.databasePort = '27017';
  env.databaseName = 'prod-db';
}

module.exports.env = env;
