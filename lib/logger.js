/**
 * Module for wrapping Winston
 * custom logger
 *
 */

//Winston is a logging module - Developped with Flatiron
var winston = require('winston')
  , winstonConfig = {
      "levels" : {
        "detail": 0,
        "trace": 1,
        "debug": 2,
        "enter": 3,
        "info": 4,
        "warn": 5,
        "error": 6
      },
      "colors" : {
        "detail": "grey",
        "trace": "white",
        "debug": "blue",
        "enter": "inverse",
        "info": "green",
        "warn": "yellow",
        "error": "red"
      } 
    }
  , winstonLogger = new (winston.Logger) ({
      transports: [new (winston.transports.Console) ({ colorize:true})],
      levels: winstonConfig.levels,
      colors: winstonConfig.colors,
    });

// Bunyan Logger instance - Useful for restify
var bunyan = require('bunyan'),
		bunyanLogger = new bunyan({name:'tldr'});


//Export logger objects
exports.winston = winstonLogger;
exports.bunyan = bunyanLogger;
