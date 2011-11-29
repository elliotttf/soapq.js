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
    res.send(valid, 500);
    return;
  }

  // Rock 'n' roll.
  var handled = false;
  var soapq = new SoapQ(params.key, params.payload, params.callback);
  res.send('processing request');

  // Save the request to the database and kick off the request chain.
  soapq.save();
  soapq.on('savedRequest', function savedRequest(message) {
    if (!handled) {
      handled = true;
      console.log(message);
      soapq.request();
    }
  });

  // We can most likely process the request without saving it to
  // the database BUT this is a huge problem if the soapq server
  // goes down for some reason.
  soapq.on('errorConnectingDB', function dangerZone(message) {
    if (!handled) {
      handled = true;
      console.log(
        'Danger zone! Request being handled without DB backing (' +
        params.key + ')'
      );
      soapq.request();
    }
  });
  soapq.on('errorSavingRequest', function dangerZone(message) {
    if (!handled) {
      handled = true;
      console.log(
        'Danger zone! Request being handled without DB backing (' +
        params.key + ')'
      );
      soapq.request();
    }
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

/**
 * Validates parameters for an incoming request.
 *
 * @param {object} params
 *   The request parameters that will be used to kickoff the process.
 *
 * @return {mixed}
 *   true if the params validate, else an error message.
 */
function validate(params) {
  if (typeof params.key === 'undefined') {
    return 'Missing key.';
  }
  if (typeof params.callback === 'undefined') {
    return 'Missing callback.';
  }
  if (typeof params.payload === 'undefined') {
    return 'Missing payload.';
  }

  return true;
}

