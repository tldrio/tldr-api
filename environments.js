var bunyan = require('./lib/logger').bunyan
  , currentEnvironment = {};      // Stores environment related data


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
  currentEnvironment.databaseHost = 'charles:migli@178.79.181.8';
  currentEnvironment.databasePort = '61458';
  currentEnvironment.databaseName = 'prod-db';
}

module.exports.currentEnvironment = currentEnvironment;
