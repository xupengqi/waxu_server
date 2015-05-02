var mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

// create a schema
var s = new Schema({
  _id: ObjectId,
  name: String
}, {
  collection: 'city'
});

// the schema is useless so far
// we need to create a model using it
var m = mongoose.model('city', s);

// make this available to our users in our Node applications
module.exports = m;
