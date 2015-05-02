var mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

// create a schema
var s = new Schema({
  _id: ObjectId,
  trip: ObjectId,
  days: [
    {
      city: {type: ObjectId, ref: 'city'},
      hotel: {type: ObjectId, ref: 'hotel'},
      poi: [{type: ObjectId, ref: 'poi'}]
    }
  ]
}, {
  collection: 'itinerary'
});

// the schema is useless so far
// we need to create a model using it
var m = mongoose.model('itinerary', s);

// make this available to our users in our Node applications
module.exports = m;
