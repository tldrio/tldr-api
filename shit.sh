#!/bin/bash

NODE_ENV=test ./node_modules/.bin/mocha test/apiClientModel.test.js test/customMarked.test.js test/customUtils.test.js test/models.test.js test/models_credentialsModel.test.js test/models_tldrHistory.test.js test/models_tldrModel.test.js test/server.test.js --reporter spec
