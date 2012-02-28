var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/tldr', function(err) {
  if (err) { throw err; }
});

var TldrSchema = new Schema({
    id: mongoose.Schema.ObjectId,
    url: String,
    summary: String
});

var TldrModel = mongoose.model('Tldr', Tldr);
