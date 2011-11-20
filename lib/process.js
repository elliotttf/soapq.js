exports.process = function(key, payload, callback) {
  // Transport variables.
  this.http = require('http');
  this.https = require('https');
  this.url = require('url');

  // Database variables.
  this.mongoose = require('mongoose');
  this.db = mongoose.connect('mongodb://localhost/soapq');
  this.requests = require('../models/models.js').requests;
  this.Model = mongoose.model('requests', requests);

  // Class variables.
  this.key = key;
  this.payload = payload;
  this.callback = callback;

}

exports.process.prototype.remove = function() {
  this.Model.remove({ 'key': this.key }, function(err) {
    console.log(err);
    throw "Error removing document";
  });
}

exports.process.prototype.add = function() {
  // Save the value to the database.
  var req = new this.Model();
  req.key = this.key;
  req.payload = this.payload;
  req.callback = this.callback;
  req.save(function(err, reqSaved) {
    console.log(err);
    trhow "Error saving document";
  });
}

exports.process.prototype.request = function() {
}

exports.process.prototype.callback = function() {
}
