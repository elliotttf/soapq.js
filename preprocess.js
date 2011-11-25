/**
 * @fileoverview Processes all queued up requests at launch time.
 */
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/soapq');
var requests = require('./models/models.js').requests;
var SoapQ = require('./lib/soapq.js').SoapQ;

/**
 * Process all unhandled requests at server launch time.
 */
exports.process = function() {
  console.log('Processing queued requests.');
  var Model = mongoose.model('requests', requests);
  Model.find({}, function(err, docs) {
    for (x in docs) {
      var doc = docs[x];
      var soapq = new SoapQ(doc.key, doc.payload, doc.respondURL);

      // Make the SOAP request.
      soapq.request();

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
  });
};
