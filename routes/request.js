/**
 * @fileoverview Handles incoming requests and kicks off
 *   the soapq process.
 */
var SoapQ = require('../lib/soapq.js').SoapQ;
var SoapQUser = require('../lib/users.js').SoapQUser;

/**
 * Handles an incoming request.
 *
 * @param {object} req
 *   The request object.
 * @param {object} res
 *   The response object.
 */
exports.request = function(req, res) {
  var ip = null;
  try {
    // Handle reverse proxy.
    ip = req.headers['x-forwarded-for'];
  }
  catch (e) {
    ip = req.connection.remoteAddress;
  }
  console.log('Incoming send request. (' + ip + ')');

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
  if (valid !== true) {
    console.log(valid);
    res.send(valid, 500);
    return;
  }

  // Rock 'n' roll.
  var user = new SoapQUser(null, null, params.apiKey);
  user.on('loaded', function loaded(msg) {
    user.authenticate();
  });
  // Handle user load errors.
  user.on('dbError', function errorConnectingDB(message) {
    console.log(message + ' (' + ip + ')');
    res.send(message, 500);
  });

  // Handle any errors and respond.
  user.on('loadError', function errorLoading(message) {
    console.log(message);
    res.send(message, 401);
  });
  user.on('errorAuthenticating', function errorAuthenticating(message) {
    console.log(message + ' (' + params.apiKey + ')');
    res.send(message, 401);
  });

  // Respond to the incoming request and start the API request job.
  user.on('authenticated', function authenticated(msg) {
    res.send('processing request (' + params.requestKey + ')');
    request(params);
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
  if (typeof params.apiKey === 'undefined') {
    return 'Missing API key.';
  }
  if (typeof params.requestKey === 'undefined') {
    return 'Missing request key.';
  }
  if (typeof params.callback === 'undefined') {
    return 'Missing callback.';
  }
  if (typeof params.payload === 'undefined') {
    return 'Missing payload.';
  }

  return true;
}

/**
 * Kicks off the external API request.
 *
 * @param {object} params
 *   The API request parameters.
 */
function request(params) {
  var handled = false;
  var soapq = new SoapQ(
    params.requestKey,
    params.payload,
    params.callback
  );

  // Save the request to the database and kick off the request chain.
  soapq.save();

  // The request has been saved, send the payload to the remote.
  soapq.on('savedRequest', function savedRequest(message) {
    if (!handled) {
      handled = true;
      console.log(message);
      soapq.request();
    }
  });

  // It's possible that we can still handle the request without DB
  // backing, but it's probably not advisable, consider removing?
  soapq.on('errorSavingRequest', function dangerZone(message) {
    if (!handled) {
      handled = true;
      console.log(
        'Danger zone! Request being handled without DB backing (' +
        params.requestKey + ')'
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
}

