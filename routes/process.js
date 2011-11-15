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
    response_json = JSON.stringify(response_json);

    // Respond to the callback with the result.
    console.log('Sending response to: ' + doc.callback);

    var callback = url.parse(doc.callback);
    var options = {
        host: callback.host
      , path: callback.path
      , method: 'POST'
      , headers: {
          'Content-Type': 'application/json'
        , 'Content-Length': response_json.length
      }
    };

    var req = http.request(options, function(res) {
      var client_response = '';
      res.on('data', function (chunk) {
        client_response += chunk;
      });

      res.on('end', function() {
        client_response = JSON.parse(client_response);
        if (client_response.status == true) {
          console.log('Sent response to: ' + doc.callback + ' server responded with: ' + client_response.data);
        }
        else {
          console.log('There was a problem sending the response to: ' + doc.callback);
        }
        // TODO - delete the request from the database.
      });
    });

    try {
      req.on('error', function(e) {
        console.log('There was a problem calling back: ' + doc.callback + ' with the result.');
      });
      req.write(response_json);
      req.end();
    }
    catch (e) {
      console.log('There was a problem connecting to the callback server: ' + doc.callback);
    }
  });
}
