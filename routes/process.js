/**
 * Handles processing requests.
 */
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/soapq');
var requests = require('../models/models.js').requests;
var http = require('http');
var https = require('https');
var url = require('url');

exports.process = function(key) {
  // Find the request we'll be processing.
  var Model = mongoose.model('requests', requests);
  Model.findOne({ "key": key }, function(err, doc) {
    if (err) {
      console.log(err);
      return null;
    }
    console.log("Processing document: " + doc.key);

    // Handle each request serially.
    for (x in doc.payload) {
      payload = doc.payload[x];
      var endpoint = url.parse(payload.endpoint);
      var options = {
          host: endpoint.host
        , path: endpoint.pathname
        , method: 'POST'
        , headers: {
            'Content-Type': 'text/xml'
          , 'Content-Length': payload.envelope.length
          , 'SOAPAction': payload.method
        }
      }

      if (typeof payload.security != 'undefined') {
        options.auth = payload.security.username + ':' + payload.security.password;
      }

      // Send along the stuff!
      console.log("Sending request to " + payload.endpoint);
      // TODO - make this block the next request.
      if (endpoint.protocol == 'https:') {
        var req = https.request(options, function(res) { respond(res, doc); });
      }
      else {
        var req = http.request(options, function(res) { respond(res, doc); });
      }

      try {
        req.on('error', function(e) {
          console.log('There was a problem processing request with key: ' + doc.key + ' and endpoint: ' + payload.endpoint);
        });
        req.write(payload.envelope);
        req.end();
      }
      catch (e) {
        console.log('There was a problem connecting to the API endpoint: ' + payload.endpoint);
      }
    }
  });
};

function respond(res, doc) {
  var response = '';
  res.on('data', function (chunk) {
    response += chunk;
  });

  res.on('end', function() {
    var response_json = {
        status: res.statusCode
      , envelope: response
    }

    // Respond to the callback with the result.
    console.log("Sending response to " + doc.callback);

    var callback = url.parse(doc.callback);
    var options = {
        host: callback.host
      , path: callback.path
      , method: 'POST'
    };

    var req = http.request(options, function(res) {
      req.on('end', function() {
        // TODO - delete the request from the database.
      });
    });

    try {
      req.on('error', function(e) {
        console.log('There was a problem calling back ' + doc.callback + ' with the result.');
      });
      req.write(response_json);
      req.end();
    }
    catch (e) {
      console.log('There was a problem connecting to the callback server: ' + doc.callback);
    }
  });
}
