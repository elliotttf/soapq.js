/**
 * @file
 * Class definition for processing soapq requests.
 */

var util = require('util'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    mongoose = require('mongoose'),
    requests = require('../models/models.js').requests;

// Event variables.
var events = require('events');

/**
 * Base class constructor.
 *
 * @param key
 *   The request key that will be stored in the database.
 * @param payload
 *   The payload to send to the remote SOAP server.
 * @param respond
 *   The location to return the SOAP result to.
 */
function SOAPQ(key, payload, respond) {
  // Initialize the database connection.
  this.db = mongoose.connect('mongodb://localhost/soapq');
  this.Model = mongoose.model('requests', requests);

  // Class variables.
  this.key = key;
  this.payload = [];
  this.respond = null;
  this.responses = [];
  this.requestStatus = true;

  if (typeof payload != 'undefined') {
    this.payload = payload;
  }

  if (typeof respond != 'undefined') {
    this.respond = respond;
  }

  events.EventEmitter.call(this);
}
util.inherits(SOAPQ, events.EventEmitter);

/**
 * Adds the soapq request to the database.
 */
SOAPQ.prototype.save = function() {
  var self = this;

  // Save the value to the database.
  var req = new self.Model();
  req.key = self.key;
  req.payload = self.payload;
  req.respond = self.respond;
  req.save(function(err, reqSaved) {
    if (err) {
      console.log(err);
      throw "Error saving request";
    }

    self.emit('savedRequest', 'Saved request to database (' + self.key + ')');
  });
}

/**
 * Loads an existing soapq request from the database.
 */
SOAPQ.prototype.load = function() {
  var self = this;
  self.Model.findOne({ 'key': self.key }, function(err, doc) {
    if (err) {
      console.log(err);
      throw "Error loading request";
    }

    self.payload = doc.payload;
    self.respond = doc.respond;
  });
}

/**
 * Removes the soapq request from the database.
 */
SOAPQ.prototype.remove = function() {
  var self = this;
  self.Model.remove({ 'key': self.key }, function(err) {
    if (err) {
      console.log(err);
      throw "Error removing document";
    }
    self.emit('removedRequest', 'Removed request from database (' + self.key + ')');
  });
}

/**
 * Sends the soapq request to the remote server.
 */
SOAPQ.prototype.request = function() {
  var self = this;
  var count = 0;

  // Request all of this payload's requests one after the other.
  var payload = self.payload[count];
  self.requestOne(payload);
  self.on('requestedOne', function(response) {
    self.responses.push(response);
    if (self.responses.length == self.payload.length) {
      self.emit('requestedRequests', 'All requests have been proccessed (' + self.key + ')');
      return;
    }

    // Increment the counter and make the next request.
    count++;
    if (count < self.payload.length) {
      self.requestOne(payload[count]);
    }
  });

  // After all requests have been processed, respond.
  self.on('requestedRequests', function(message) {
    console.log(message);
    self.respond();
  });
}

/**
 * Sends a single request to the SOAP server.
 *
 * @param payload
 *   An object containing the following:
 *    endpoint - the SOAP server to contact.
 *    envelope - the SOAP envelope to send.
 *    security (optional) - the SOAP server httpauth credentials.
 */
SOAPQ.prototype.requestOne = function(payload) {
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
  }

  if (typeof payload.security != 'undefined') {
    options.auth = payload.security.username + ':' + payload.security.password;
  }

  // Send along the stuff!
  console.log("Sending request to " + payload.endpoint);
  if (endpoint.protocol == 'https:') {
    var req = https.request(options, function(res) {
      var response = '';
      res.on('data', function(chunk) {
        response += chunk;
      });

      res.on('end', function() {
        self.emit('requestedOne', response);
      });
    });
  }
  else {
    var req = http.request(options, function(res) {
      var response = '';
      res.on('data', function(chunk) {
        response += chunk;
      });

      res.on('end', function() {
        self.emit('requestedOne', response);
      });
    });
  }

  try {
    req.on('error', function(e) {
      self.requestStatus = false;
      console.log('There was a problem processing request with key: ' + doc.key + ' and endpoint: ' + payload.endpoint);
      self.emit('requestError', 'Error during request (' + self.key + ')');
    });
    req.write(payload.envelope);
    req.end();
  }
  catch (e) {
    self.requestStatus = false;
    console.log('There was a problem connecting to the API endpoint: ' + payload.endpoint);
    self.emit('requestError', 'Error during request (' + self.key + ')');
  }
}

/**
 * Responds to the respond with the SOAP result.
 */
SOAPQ.prototype.respond = function() {
  var self = this;

  var response_json = {
    'status': self.requestStatus,
    'responses': self.responses
  }
  response_json = JSON.stringify(response_json);

  // Respond to the respond with the result.
  console.log('Sending response to: ' + doc.respond);

  var respond = url.parse(doc.respond);
  var options = {
    'host': respond.host,
    'path': respond.path,
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/json',
      'Content-Length': response_json.length
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
        console.log('Sent response to: ' + doc.respond + ' server responded with: ' + client_response.data);
        self.remove();
        self.emit('processedRequest');
      }
      else {
        console.log('There was a problem sending the response to: ' + doc.respond);
      }
    });
  });

  try {
    req.on('error', function(e) {
      console.log('There was a problem calling back: ' + doc.respond + ' with the result.');
    });
    req.write(response_json);
    req.end();
  }
  catch (e) {
    console.log('There was a problem connecting to the respond server: ' + doc.respond);
  }
}

exports.SOAPQ = SOAPQ;

