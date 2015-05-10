var mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

// create a schema
var s = new Schema({
  _id: ObjectId,
  name: String,
  address: String,
  star: Number,
  tags: Object,
  amenities: [String],
  city: ObjectId
}, {
  collection: 'hotel'
});

// the schema is useless so far
// we need to create a model using it
var m = mongoose.model('hotel', s);

// make this available to our users in our Node applications
module.exports = m;
