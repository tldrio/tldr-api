/**
 * Module for wrapping Winston
 * custom logger
 *
 */

//Winston is a logging module - Developped with Flatiron
var winston = require('winston'),
    // Config object for logger
    logger_config = {
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
                    },
    // Instantiate Logger
    logger = new(winston.Logger)({
      transports: [new (winston.transports.Console)({
                          colorize:true}),],
      levels: logger_config.levels,
      colors: logger_config.colors,
    });

// Bunyan Logger instance - Useful for restify
var bunyanLogger = require('bunyan'),
		blogger = new bunyanLogger({name:'tldr'});


//Export logger objet
exports.logger = logger;
exports.blogger = blogger;
