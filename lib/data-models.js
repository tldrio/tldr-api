/*!
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

function defineModels (mongoose, callback) {
	Schema = mongoose.Schema;

	// Mongoose Schema for a tldr object
	
	var TldrSchema = new Schema({
			_id: Number,
			clean_url: String,
			summary: String,
	});

	// Register Schema to associated name
	mongoose.model('tldrObject', TldrSchema);

	// Call provided callback
	callback();
}


// exports defineModels function
exports.defineModels = defineModels;
