#!/bin/bash

node server.js | node_modules/.bin/bunyan -o simple
