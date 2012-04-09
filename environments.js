var bunyan = require('./lib/logger').bunyan
	, fs = require('fs')
  , currentEnvironment = {}      // Stores environment related data
	, contentOfFile // Following variables are for the remote connection informations
	, dbInfo
	, ipAddress
	, port
	, user
	, pwd;


// Define environment
// Default environment is development
currentEnvironment.environment = process.env.TLDR_ENV || 'development';
bunyan.info("Environment set to %s", currentEnvironment.environment);

// Corresponds to environment='development', no "if" to ensure variables are always set
currentEnvironment.databaseHost = 'localhost';
currentEnvironment.databasePort = '27017';
currentEnvironment.databaseName = 'dev-db';

if (currentEnvironment.environment === 'test') {
  currentEnvironment.databaseHost = 'localhost';
  currentEnvironment.databasePort = '27017';
  currentEnvironment.databaseName = 'test-db';
}

if (currentEnvironment.environment === 'remote') {
	// yodawg.info contains infos in the following format
	// ipAddress port user pwd
	// separator is just a space
	contentOfFile = fs.readFileSync('./yodawg.info', 'utf8'); 
	dbInfo = contentOfFile.split(' ');
	ipAddress = dbInfo[0];
	port = dbInfo[1];
	user = dbInfo[2];
	pwd = dbInfo[3];
  currentEnvironment.databaseHost = user+ ':' + pwd + '@' + ipAddress;
  currentEnvironment.databasePort = parseInt(port, 10);
  currentEnvironment.databaseName = 'remote-db'; 
}

module.exports.currentEnvironment = currentEnvironment;
