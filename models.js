/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var TldrModel = require('./models/tldrModel');



// Export TldrModel
module.exports.TldrModel = TldrModel.Model;
module.exports.createTldr = TldrModel.createInstance;
