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

      if (poi.hours[dayOfWeek][0] <= hour && poi.hours[dayOfWeek][1] >= hour+poi.duration) {
        open = true;
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
    var moment =require('moment');

    // end hour means end at that time
    // 20 means end at 8pm not 9pm
    // day of the week range from 0-6
    var startTime = 10;
    var endTime = 20;
    var days = 1;
    var dayOfWeek = moment(req.body.from).isoWeekday() - 1;
    var bestPOIs = getBestPOIs(data.pois, req.body.tags, startTime, endTime, days, dayOfWeek);

    res.json({
      startTime: startTime,
      endTime: endTime,
      days: days,
      dayOfWeek: dayOfWeek,
      hotel: bestHotel,
      pois: bestPOIs});

  });
});

app.get('/t', function (req, res) {
  var fs = require('fs');
  var path = require('path');
  var filePath = path.join(__dirname, 'poi.json');
  fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
    if (!err){
      res.json(data);

      writePOI(JSON.stringify(translatePOI(JSON.parse(data)), null, '  '));
    }else{
      console.log(err);
    }
  });
});

var translatePOI = function(data) {
  var pois = [];
  for (var i in data) {
    var poi = data[i];
    var newpoi = {};

    newpoi._id = poi._id;
    newpoi.name = poi.name;
    newpoi.address = poi.Address;
    newpoi.city = poi.city;
    newpoi.region = poi.region;
    newpoi.rank = poi.rank;
    newpoi.reviews = poi.reviews;
    newpoi.review_rating = poi.review_rating;
    newpoi.ppp = poi.ppp;
    newpoi.duration = poi.duration;

    newpoi.tags = {};
    if (poi['family-friendly']) newpoi.tags['family-friendly'] = poi['family-friendly'];
    if (poi['romantic']) newpoi.tags['romantic'] = poi['romantic'];
    if (poi['luxury']) newpoi.tags['luxury'] = poi['luxury'];
    if (poi['museum']) newpoi.tags['museum'] = poi['museum'];
    if (poi['history']) newpoi.tags['history'] = poi['history'];
    if (poi['animals']) newpoi.tags['animals'] = poi['animals'];
    if (poi['nature']) newpoi.tags['nature'] = poi['nature'];
    if (poi['water-sports']) newpoi.tags['water-sports'] = poi['water-sports'];
    if (poi['scenic']) newpoi.tags['scenic'] = poi['nature'];
    if (poi['art']) newpoi.tags['art'] = poi['art'];
    if (poi['rollercoaster']) newpoi.tags['rollercoaster'] = poi['rollercoaster'];
    if (poi['hiking']) newpoi.tags['hiking'] = poi['hiking'];
    if (poi['architecture']) newpoi.tags['architecture'] = poi['architecture'];

    newpoi.hours = [];
    if (poi['Mon']) newpoi.hours.push(parseHours(poi['Mon'])); else newpoi.hours.push([]);
    if (poi['Tue']) newpoi.hours.push(parseHours(poi['Tue'])); else newpoi.hours.push([]);
    if (poi['Wed']) newpoi.hours.push(parseHours(poi['Wed'])); else newpoi.hours.push([]);
    if (poi['Thu']) newpoi.hours.push(parseHours(poi['Thu'])); else newpoi.hours.push([]);
    if (poi['Fri']) newpoi.hours.push(parseHours(poi['Fri'])); else newpoi.hours.push([]);
    if (poi['Sat']) newpoi.hours.push(parseHours(poi['Sat'])); else newpoi.hours.push([]);
    if (poi['Sun']) newpoi.hours.push(parseHours(poi['Sun'])); else newpoi.hours.push([]);

    pois.push(newpoi);
  }
  return pois;
};

var parseHours = function(hours) {
  var hoursArr = [];

  var timeArr = hours.split("-");
  hoursArr.push(parseInt(timeArr[0])/100);
  hoursArr.push(parseInt(timeArr[1])/100);

  return hoursArr;
};

var writePOI = function(data) {
  var fs = require('fs');
  var path = require('path');
  var filePath = path.join(__dirname, 'poi_new.json');
  fs.writeFile(filePath, data, function(err) {
      console.log("The file was saved!");
  });
};

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Waxu listening at http://%s:%s', host, port);

});
