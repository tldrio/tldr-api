/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
	, TldrSchema
  , TldrModel;

	
// Define tldr scehma
TldrSchema = new Schema({
	_id:     Number,
	url:     String,
	summary: String
});

// Define tldr model
TldrModel = mongoose.model('tldr', TldrSchema);


// exports defineModels function
exports.TldrModel = TldrModel;
