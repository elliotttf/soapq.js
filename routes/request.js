/**
 * @fileoverview Handles incoming requests and kicks off
 *   the soapq process.
 */
var SOAPQ = require('../lib/soapq.js').SOAPQ;

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
  var soapq = new SOAPQ(params.key, params.payload, params.callback);

  soapq.save();
  soapq.on('savedRequest', function(message) {
    res.send('processing request');
    console.log(message);
    soapq.request();
  });
};

function validate(params) {
  if (typeof params.key == 'undefined') {
    return 'missing key';
  }

  return true;
}

