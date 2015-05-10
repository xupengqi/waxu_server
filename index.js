var express = require('express');
var app = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var Q = require("q");

mongoose.connect('mongodb://doojiaapp.com/waxu', {
  user: 'waxu',
  pass: 'waxu'
});

process.on('uncaughtException', function (exception) {
  console.log(exception); // to see your exception details in the console
  // if you are on production, maybe you can send the exception details to your
  // email as well ?
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
    res.json(itinerary);
  });
});

app.post("/trip", jsonParser, function (req, res) {
  var getBest = function(items, tags) {
    var best = items[0];
    for (var i=0; i<items.length; i++) {
      for (var j=0; j<tags.length; j++) {
        if (items[i].tags[tags[j]]) {
          items[i].score = (items[i].score || 0) + items[i].tags[tags[j]];
        }
      }
      if (!best.score || items[i].score > best.score) {
        best = items[i];
      }
    }
    return best;
  };

  var canToGoPOI = function(poi, dayOfWeek, hour, endHour) {
    //if open
    if (poi.hours && poi.hours[dayOfWeek]) {
      var open = false;
      for (var i=0; i<poi.hours[dayOfWeek].length; i++) {
        if (poi.hours[dayOfWeek][i][0] <= hour && poi.hours[dayOfWeek][i][1] >= hour+poi.duration) {
          open = true;
        }
      }
      if (!open) {
        //console.log(poi.name + " is not open on "+dayOfWeek + " at "+hour);
        return false;
      }
    }

    //if have enough time to visit
    if (poi.duration + hour > endHour) return false;

    return true;
  };

  var updateTotalPOIWeight = function(poi, dayOfWeek, hour) {

  };

  var getBestPOIAtTime = function(pois, dayOfWeek, hour, endHour) {
    var bestPOIIndex = -1;

    for (var i=0; i<pois.length; i++) {
      if (pois[i].selected) continue;

      if (!canToGoPOI(pois[i], dayOfWeek, hour, endHour)) continue;

      updateTotalPOIWeight(pois[i], dayOfWeek, hour);

      if (bestPOIIndex < 0 || pois[bestPOIIndex].score < pois[i].score) {
        bestPOIIndex = i;
      }
    }

    if (bestPOIIndex >= 0) {
      pois[bestPOIIndex].selected = true;
      return pois[bestPOIIndex];
    }

    return null;
  };

  var getBestPOIs = function(pois, tags, startHour, endHour, numDays, startDayofWeek) {
    var i,j;

    for (i=0; i<pois.length; i++) {
      pois[i].score = 0;
      for (j=0; j<tags.length; j++) {
        if (pois[i].tags[tags[j]]) {
          pois[i].score += pois[i].tags[tags[j]];
        }
      }
    }

    var days = [];
    for (i=0; i<numDays; i++) {
      var day = [];
      for (j=startHour; j<endHour; j++) {
        var poi = getBestPOIAtTime(pois, (startDayofWeek+i)%7, j, endHour);
        if (poi) {
          day.push(poi);
          if (poi.duration > 1) {
            j += poi.duration-1;
          }
        }
      }
      days.push(day);
    }

    return days;
  };

  var data = {
    hotels: [],
    pois: [],
    timeQuota: 8,
    paceMultiplier: 1,
  };
  var hotelsDefer = Q.defer();
  var poisDefer = Q.defer();
  hotel.find({city:req.body.city}, function(err, hotels) {
    data.hotels = hotels;
    hotelsDefer.resolve(hotels);
  });
  poi.find({city:req.body.city}, function(err, pois) {
    data.pois = pois;
    poisDefer.resolve(pois);
  });

  Q.allSettled([hotelsDefer.promise, poisDefer.promise]).then(function(h,p) {
    var bestHotel = getBest(data.hotels, req.body.tags);

    // end hour means end at that time
    // 20 means end at 8pm not 9pm
    // day of the week range from 0-6
    var bestPOIs = getBestPOIs(data.pois, req.body.tags, 10, 20, 1, 1);

    res.json(bestPOIs);

  });
});

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Waxu listening at http://%s:%s', host, port);

});
