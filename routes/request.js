/**
 * GET send page.
 */

exports.request = function(req, res){
  console.log('Incoming send request.');

  var valid = false;
  var params = null;

  if (req.method == 'GET') {
    params = req.query;
  }
  else if (req.method == 'POST') {
    params = req.body;
  }

  if (!validate(params)) {
    res.send('Malformed request.', 500);
    return;
  }

  // Store the request and respond to the client.
  var mongoose = require('mongoose');
  var db = mongoose.connect('mongodb://localhost/soapq');
  var requests = require('../models/models.js').requests;

  mongoose.model('Document', requests);
  var Request = mongoose.model('Document');

  try {
    var request = new Request();
    request.key = params.key;
    request.payload = params.payload;
    request.callback = params.callback;
    request.save(function(err, req_Saved) {
      if (err) {
        throw err;
        console.log(err);
      }
    });
  }
  catch (err) {
    res.send('error handling request', 500);
    return;
  }

  res.send('processing request');

  // Process the request.
  console.log('processing request');
};

function validate(params) {
  if (typeof params.key == 'undefined') {
    return false;
  }

  return true;
}

