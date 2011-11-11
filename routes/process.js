/**
 * Handles processing requests.
 */
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/soapq');
var requests = require('../models/models.js').requests;
var http = requrie('http');
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
      var wsdl = url.parse(payload.wsdl);
      var options = {
          host: wsdl.host
        , port: wsdl.port
        , path: wsdl.pathname
        , method: 'POST'
      }

      if (typeof payload.security != 'undefined') {
        options.auth = payload.security.username + ':' + payload.security.password;
      }

      // Send along the stuff!
      console.log("Sending request to " + payload.wsdl);
      // TODO - make this block the next request.
      // TODO - handle errors and such.
      http.request(options, respond(res, doc.callback));
    }
  });
};

function respond(res, callback) {
  // Respond to the callback with the result.
  console.log("Sending response to " + callback);
}
