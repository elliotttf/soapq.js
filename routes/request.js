/**
 * GET send page.
 */
var process = require('./process.js').process;
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/soapq');
var requests = require('../models/models.js').requests;
mongoose.model('requests', requests);

exports.request = function(req, res){
  console.log('Incoming send request.');

  var params = null;

  if (req.method == 'GET') {
    params = req.query;
  }
  else if (req.method == 'POST') {
    params = req.body;
  }

  // Wut?
  if (params == null) {
    res.send('Malformed request.', 500);
    return;
  }

  // Valid?
  var valid = validate(params);
  if (valid != true) {
    console.log(valid);
    var msg = 'Unknown error.';
    if (valid == "missing key") {
      msg = "Missing 'key'.";
    }
    res.send(msg, 500);
    return;
  }

  // Store the request and respond to the client.
  var Request = mongoose.model('requests');

  var request = new Request();
  request.key = params.key;
  request.payload = params.payload;
  request.callback = params.callback;
  request.save(function(err, req_Saved) {
    if (err) {
      console.log(err);
      res.send('error handling request', 500);
      return;
    }

    // Process the request.
    console.log('processing request');
    res.send('processing request');
    process(params.key);
  });
};

function validate(params) {
  if (typeof params.key == 'undefined') {
    return "missing key";
  }

  return true;
}

