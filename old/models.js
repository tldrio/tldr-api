function defineModels (mongoose, callback) {
    Schema = mongoose.Schema;

    /* 
     * Mongoose Schema for a tldr object
     */
    var TldrSchema = new Schema({
        _id: Schema.ObjectId,
        clean_url: String,
        summary: String,
        short_url: String,
        domain: String,
        source_author: String,
        source_title: String, 
        source_published_at: Date,
        summary_last_edited_at: Date,
        summary_contributors: [String],
        tags: [String],
        view_counter: Number
    });
   
    /* 
     * Mongoose Schema for a user profile
     */
    var UserSchema = new Schema({
        name: String,
        hash_pwd: Number,
        email: String
    });
    
    /*
     * We export a reference to the Schema
     */
    mongoose.model('tldr', TldrSchema);
    mongoose.model('user', UserSchema);
    /* 
     * Once model is defined we call the callback provided in arguments
     */
    callback();
}

/*
 * Export the function through the commonJS module system 
 */

exports.defineModels = defineModels;
