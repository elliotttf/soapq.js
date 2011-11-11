/**
 * Handles processing requests.
 */
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/soapq');
var requests = require('../models/models.js').requests;

exports.process = function(key) {
  // Find the request we'll be processing.
  var Model = mongoose.model('requests', requests);
  Model.findOne({ "key": key }, function(err, doc) {
    if (err) {
      console.log(err);
      return null;
    }
    console.log("Processing document: " + doc.key);
  });
}
