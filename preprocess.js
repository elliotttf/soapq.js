/**
 * Processes all queued up requests at launch time.
 */
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/soapq');
var requests = require('./models/models.js').requests;
var SOAPQ = require('./lib/soapq.js').SOAPQ;

exports.process = function() {
  console.log('Processing queued requests.');
  var Model = mongoose.model('requests', requests);
  Model.find({}, function (err, docs) {
    for (x in docs) {
      var doc = docs[x];
      var soapq = new SOAPQ(doc.key, doc.payload, doc.callback);
      soapq.request();
    }
  });
};
