/**
 * Models definitions.
 */

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

exports.requests = new Schema({
  key: { type: String, index: true },
  callback: String,
  payload: {},
});

