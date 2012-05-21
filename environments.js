/*
 * Environment related variables. 'localhost' is our local machines when in 'development', the server when in 'staging' and 'master'
 * and can be both for 'test'
 */


var bunyan = require('./lib/logger').bunyan
  , env = {}      // Stores environment related data


// Define environment
// Default environment is development
env.name = process.env.TLDR_ENV || 'development';
bunyan.info("Environment set to %s", env.name);

if (env.name === 'development') {
  env.databaseHost = 'localhost';
  env.databasePort = '27017';
  env.databaseName = 'dev-db';
}

if (env.name === 'test') {
  env.databaseHost = 'localhost';
  env.databasePort = '27017';
  env.databaseName = 'test-db';
}

if (env.name === 'staging') {
  env.databaseHost = 'localhost';
  env.databasePort = '27017';
  env.databaseName = 'prod-db';
}

if (env.name === 'master') {
  env.databaseHost = 'localhost';
  env.databasePort = '27017';
  env.databaseName = 'prod-db';
}

module.exports.env = env;
