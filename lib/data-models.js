/*!
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

Schema = mongoose.Schema;

// Mongoose Schema for a tldr object

var TldrSchema = new Schema({
		url:     String
	, summary: String
});

// Register Schema to associated name
mongoose.model('tldr', TldrSchema);

// exports defineModels function
exports.defineModels = defineModels;
