var express = require('express');
var app = express();
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/waxu', {
  user: 'waxu',
  pass: 'waxu'
});


var city = require('./model/city');
var poi = require('./model/poi');
var hotel = require('./model/hotel');
var itinerary = require('./model/itinerary');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/itinerary/:id', function (req, res) {
  itinerary.findOne({_id:req.params.id}).populate("days.city").populate("days.hotel").populate("days.poi").exec(function (err, itinerary) {
    console.log(itinerary);
    console.log(itinerary.days[0]);
    res.json(itinerary);
  });
});

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
