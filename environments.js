var bunyan = require('./lib/logger').bunyan
  , env = {}      // Stores environment related data


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

if (env.name === 'production') {
  env.databaseHost = 'localhost';
  env.databasePort = '27017';
  env.databaseName = 'prod-db';
}

module.exports.env = env;
