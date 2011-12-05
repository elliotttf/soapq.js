/**
 * @fileoverview Class definition for processing soapq requests.
 */

var util = require('util');
var http = require('http');
var https = require('https');
var url = require('url');
var mongoose = require('mongoose');
var requests = require('../models/models.js').requests;
var events = require('events');

/**
 * Base class constructor.
 *
 * @param {string} key
 *   The request key that will be stored in the database.
 * @param {array} payload
 *   The payload to send to the remote SOAP server.
 * @param {string} respondURL
 *   The location to return the SOAP result to.
 * @constructor
 * @extends {events.EventEmitter}
 */
function SoapQ(key, payload, respondURL) {
  // Initialize the database connection.
  this.db = mongoose.connect('mongodb://localhost/soapq');
  this.Requests = mongoose.model('requests', requests);

  // Class variables.
  this.key = key;
  this.payload = [];
  this.respondURL = null;
  this.responses = [];
  this.requestStatus = true;

  if (typeof payload != 'undefined') {
    this.payload = payload;
  }

  if (typeof respondURL != 'undefined') {
    this.respondURL = respondURL;
  }

  events.EventEmitter.call(this);

  var self = this;
  mongoose.connection.on('error', function(err) {
    self.emit('dbError', err);
  });
}
util.inherits(SoapQ, events.EventEmitter);

// Class constants.
/**
 * Maximum number of times to retry a failed request.
 * @const
 * @type {int}
 */
SoapQ.RETRY_THRESHOLD = 3;

/**
 * Adds the soapq request to the database.
 */
SoapQ.prototype.save = function() {
  var self = this;

  // Save the value to the database.
  var req = new self.Requests();
  req.key = self.key;
  req.payload = self.payload;
  req.respondURL = self.respondURL;
  req.save(function onSave(err, reqSaved) {
    if (err) {
      console.log(err);
      self.emit('errorSavingRequest', err);
    }

    self.emit(
      'savedRequest',
      'Saved request to database (' + self.key + ')'
    );
  });
};

/**
 * Loads an existing soapq request from the database.
 */
SoapQ.prototype.load = function() {
  var self = this;
  self.Requests.findOne(
    { 'key': self.key },
    function foundOne(err, doc) {
      if (err) {
        console.log(err);
        throw 'Error loading request';
      }

      self.payload = doc.payload;
      self.respondURL = doc.respondURL;
    }
  );
};

/**
 * Removes the soapq request from the database.
 */
SoapQ.prototype.remove = function() {
  var self = this;
  self.Requests.remove({ 'key': self.key }, function removed(err) {
    if (err) {
      console.log(err);
      throw 'Error removing document';
    }
    self.emit(
      'removedRequest',
      'Removed request from database (' + self.key + ')'
    );
  });
};

/**
 * Sends the soapq request to the remote server.
 */
SoapQ.prototype.request = function() {
  var self = this;
  var count = 0;
  var retry = 0;

  // Request all of this payload's requests one after the other.
  var payload = self.payload[count];
  self.requestOne(payload);
  self.on('requestedOne', function requestedOne(response) {
    // Reset the retry count.
    retry = 0;

    // Store the response XML.
    self.responses.push(response);

    // If we're done requesting, notify.
    if (self.responses.length == self.payload.length) {
      self.emit(
        'requestedRequests',
        'All requests have been proccessed (' + self.key + ')'
      );
      return;
    }

    // Increment the counter and make the next request.
    count++;
    if (count < self.payload.length) {
      self.requestOne(payload[count]);
    }
  });

  // If a request failed and we haven't retried more than what we decide
  // is sane, retry the failed request.
  self.on('requestError', function requestError(message) {
    if (retry < SoapQ.RETRY_THRESHOLD) {
      console.log('Retrying request (' + self.key + ')');
      retry++;
      self.requestOne(payload[count]);
    }
    else {
      console.log('Too many retry failures, bailing (' + self.key + ')');
      self.emit(
        'requestErrors',
        'There was a problem communicating with the server (' +
          self.key +
        ')'
      );
    }
  });
};

/**
 * Sends a single request to the SOAP server.
 *
 * @param {object} payload
 *   An object containing the following:
 *    <ul>
 *      <li>endpoint - the SOAP server to contact.</li>
 *      <li>envelope - the SOAP envelope to send.</li>
 *      <li>security (optional) - the SOAP server httpauth credentials.</li>
 *    </ul>
 */
SoapQ.prototype.requestOne = function(payload) {
  var self = this;
  var endpoint = url.parse(payload.endpoint);
  var options = {
    host: endpoint.host,
    path: endpoint.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'Content-Length': payload.envelope.length
    }
  };

  if (typeof payload.security != 'undefined') {
    options.auth = payload.security.username + ':' + payload.security.password;
  }

  // Send along the stuff!
  console.log('Sending request to ' + payload.endpoint);
  if (endpoint.protocol == 'https:') {
    var req = https.request(options, function onRequest(res) {
      var response = '';
      res.on('data', function(chunk) {
        response += chunk;
      });

      res.on('end', function onEnd() {
        self.emit('requestedOne', response);
      });
    });
  }
  else {
    var req = http.request(options, function onRequest(res) {
      var response = '';
      res.on('data', function onData(chunk) {
        response += chunk;
      });

      res.on('end', function onEnd() {
        // TODO - verify that this is the only valid return code.
        if (res.statusCode != 200) {
          self.emit(
            'requestError',
            'Error during request (' + self.key + ')'
          );
        }
        else {
          self.emit('requestedOne', response);
        }
      });
    });
  }

  try {
    req.on('error', function onError(e) {
      console.log(
        'There was a problem processing request with key: ' +
        doc.key + ' and endpoint: ' + payload.endpoint
      );
      self.emit(
        'requestError',
        'Error during request (' + self.key + ')'
      );
    });
    req.write(payload.envelope);
    req.end();
  }
  catch (e) {
    console.log(
      'There was a problem connecting to the API endpoint: ' +
      payload.endpoint
    );
    self.emit('requestError', 'Error during request (' + self.key + ')');
  }
};

/**
 * Responds to the respond callback with the SOAP result.
 */
SoapQ.prototype.respond = function() {
  var self = this;

  var response_json = {
    'status': self.requestStatus,
    'responses': self.responses
  };
  response_json = JSON.stringify(response_json);

  // Respond to the respond with the result.
  console.log('Sending response to: ' + self.respondURL);

  var respond = url.parse(self.respondURL);
  var options = {
    'host': respond.host,
    'path': respond.path,
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/json',
      'Content-Length': response_json.length
    }
  };

  var req = http.request(options, function onRequest(res) {
    var client_response = '';
    res.on('data', function onData(chunk) {
      client_response += chunk;
    });

    res.on('end', function onEnd() {
      try {
        client_response = JSON.parse(client_response);
      } catch (e) {
        console.log(
          'Server responded with invalid JSON, too bad bro (' +
          self.key + ')'
        );
        client_response = { status: true };
      }
      if (client_response.status == true) {
        console.log(
          'Sent response to: ' + self.respondURL +
          ' server responded with: ' + client_response.data
        );
        self.emit(
          'processedRequest',
          'Processed request successfully (' + self.key + ')'
        );
      }
      else {
        console.log(
          'There was a problem sending the response to: ' +
          self.respondURL
        );
      }
    });
  });

  try {
    req.on('error', function onError(e) {
      console.log(
        'There was a problem calling back: ' +
        self.respondURL + ' with the result.'
      );
    });
    req.write(response_json);
    req.end();
  }
  catch (e) {
    console.log(
      'There was a problem connecting to the respond server: ' +
      self.respondURL
    );
  }
};

/**
 * Exports the SoapQ class.
 */
exports.SoapQ = SoapQ;

