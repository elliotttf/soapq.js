/**
 * @fileoverview handles user information.
 */

var events = require('events');
var mongoose = require('mongoose');
var users = require('../models/models.js').users;
var util = require('util');
var uuid = require('node-uuid');

/**
 * Base user class.
 *
 * @param {string} email
 *   The user's email address.
 * @param {string} domain
 *   The domain the API will be used from.
 * @param {string} key
 *   (optional) The API key for this user. If this value
 *   is passed in email and domain will be ignored and
 *   the user will be loaded from the database.
 * @constructor
 * @extends {events.EventEmitter}
 */
function SoapQUser(email, domain, key) {
  var self = this;
  // Database info.
  self.db = mongoose.connect('mongodb://localhost/soapq');
  self.Users = mongoose.model('users', users);

  mongoose.connection.on('error', function dbError(err) {
    self.emit('dbError', 'Error connecting to database');
  });

  // Class variables.
  self.email = email;
  self.domain = domain;
  self.key = null;
  self.active = true;
  self.created = self.updated = Date.now();

 // Load the user from the database if we have a key.
  if (typeof key !== 'undefined') {
    self.Users.findOne({ 'key': key }, function foundOne(err, doc) {
      if (err) {
        self.emit('error', err);
        return;
      }
      if (doc === null) {
        self.emit('error', 'User not found.');
        return;
      }

      self.key = doc.key;
      self.email = doc.email;
      self.domain = doc.domain;
      self.active = doc.active;
      self.created = doc.created;
      self.updated = doc.updated;

      self.emit('loaded', 'User data loaded from database.');
    });
  }
}
util.inherits(SoapQUser, events.EventEmitter);

/**
 * Validates new user information before saving.
 */
SoapQUser.prototype.validate = function() {
  var self = this;
  // Check the database for the email address.
  self.Users.findOne({ 'email': self.email }, function foundOne(err, doc) {
    if (err) {
      console.log(err);

      self.emit('error', 'Validation error');
      self.emit('validatedWithErrors', 'Validation complete, with errors.');
      return;
    }
    if (doc !== null) {
      self.emit('error', 'Mail in use');
      self.emit('validatedWithErrors', 'Validation complete, with errors.');
      return;
    }

    self.emit('validated', 'Validation complete.');
  });
};

/**
 * Saves the user in the database.
 */
SoapQUser.prototype.save = function() {
  var self = this;
  var user = new self.Users();
  user.email = self.email;
  user.domain = self.domain;
  user.active = self.active;
  user.key = uuid.v1();
  user.created = self.created;
  user.updated = self.updated;
  user.save(function onSave(err, doc) {
    if (err) {
      console.log(err);
      self.emit('error', err);
      return;
    }
    console.log('New API key! (' + doc.key + ')');
    self.key = doc.key;
    self.emit('saved', doc.key);
  });
};

/**
 * Deletes the user from the database.
 */
SoapQUser.prototype.remove = function() {
  var self = this;
  if (typeof self.key === 'undefined') {
    self.emit('error', 'Cannot remove user with unknown key.');
    return;
  }
  self.Users.remove({ 'key': self.key }, function removed(err) {
    if (err) {
      console.log(err);
      self.emit(err);
      return;
    }
    console.log('Removed user. (' + self.key + ')');
    self.emit('removed', 'User removed successfully');
  });
};

/**
 * Authenticates the API request.
 */
SoapQUser.prototype.authenticate = function() {
  var self = this;
  self.Users.findOne({ 'key': self.key }, function foundOne(err, doc) {
    if (err) {
      console.log(err);
      self.emit('errorAuthenticating', err);
    }

    // Not found, bail.
    if (doc === null) {
      self.emit('errorAuthenticating', 'Key not found.');
      return;
    }

    if (typeof doc.active === 'undefined' || !doc.active) {
      self.emit('errorAuthenticating', 'This key is inactive.');
      return;
    }

    self.emit('authenticated', 'Found active key.');
  });
};

/**
 * Exports the SoapQUser class.
 */
exports.SoapQUser = SoapQUser;
