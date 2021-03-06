var mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

// create a schema
var s = new Schema({
  _id: ObjectId,
  name: String,
  address: String,
  tags: Object,
  city: ObjectId,
  Fee: Number,
  duration: Number,
  hours: Array
}, {
  collection: 'poi'
});

// the schema is useless so far
// we need to create a model using it
var m = mongoose.model('poi', s);

// make this available to our users in our Node applications
module.exports = m;
