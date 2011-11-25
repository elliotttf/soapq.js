/**
 * @fileoverview Handles incoming requests and kicks off
 *   the soapq process.
 */
var SoapQ = require('../lib/soapq.js').SoapQ;

/**
 * Handles an incoming request.
 *
 * @param {object} req
 *   The request object.
 * @param {object} res
 *   The response object.
 */
exports.request = function(req, res) {
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
    if (valid == 'missing key') {
      msg = 'Missing key.';
    }
    res.send(msg, 500);
    return;
  }

  // Rock 'n' roll.
  var soapq = new SoapQ(params.key, params.payload, params.callback);

  // Save the request to the database and kick off the request chain.
  soapq.save();
  soapq.on('savedRequest', function savedRequest(message) {
    res.send('processing request');
    console.log(message);
    soapq.request();
  });

  // After all requests have been made, respond to the callback.
  soapq.on('requestedRequests', function requestedRequests(message) {
    console.log(message);
    soapq.respond();
  });

  // If there was an error during processing log it and set the request
  // status to false.
  soapq.on('requestErrors', function requestErrors(message) {
    console.log(message);
    soapq.requestStatus = false;
    soapq.respond();
  });

  // After the request was processed, remove it from the database.
  soapq.on('processedRequest', function processedRequest(message) {
    soapq.remove();
  });
};

function validate(params) {
  if (typeof params.key == 'undefined') {
    return 'missing key';
  }

  return true;
}

