/**
 * Models definitions.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Defines the requests schema.
 */
exports.requests = new Schema({
  key: { type: String, index: true, unique: true },
  callback: String,
  payload: {}
});

/**
 * Defines the user schema.
 */
exports.users = new Schema({
  key: { type: String, index: true, unique: true },
  email: String,
  domain: String,
  active: Boolean,
  created: Number,
  updated: Number
});

