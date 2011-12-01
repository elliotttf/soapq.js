/**
 * @fileoverview Allows users to register new API keys.
 */

var events = require('events');
var mongoose = require('mongoose');
var users = require('../models/models.js').users;
var uuid = require('node-uuid');

/**
 * Exports the register page.
 */
exports.register = function(req, res) {
  var messages = {
    'notice': [],
    'warning': [],
    'error': [],
  };
  var valid = false;

  if (req.method === 'POST') {
    var ev = new events.EventEmitter();
    validRegistration(req.body, messages, ev);

    ev.on('error', function pushError(err) {
      messages.error.push(err);
    });

    ev.on('dbError', function dbError(err) {
      messages.error.push(err);
      res.render(
        'register',
        {
          'title': 'Register API Key',
          'messages': messages,
        }
      );
    });

    ev.on('validatedWithErrors', function validatedWithErrors(msg) {
      res.render(
        'register',
        {
          'title': 'Register API Key',
          'messages': messages,
        }
      );
    });

    ev.on('validated', function validated(msg) {
      saveRegistration(body, ev);
    });

    ev.on('saved', function saved(key) {
      console.log('New API key! (' + key + ')');
      res.render(
        'complete',
        {
          'title': 'Thank you for registering',
          'key': key,
        }
      );
    });
  }
  else {
    res.render(
      'register',
      {
        'title': 'Register API Key',
        'messages': messages,
      }
    );
  }
}

function validRegistration(body, ev) {
  var db = mongoose.connect('mongodb://localhost/soapq');
  var Users = mongoose.model('users', users);
  mongoose.connection.on('error', function dbError(err) {
    ev.emit('dbError', 'Error connecting to database');
  });

  // Check the database for the email address.
  Users.findOne({ 'mail': body.mail }, function foundOne(err, doc) {
    if (err) {
      console.log(err);

      ev.emit('error', 'Validation error');
      ev.emit('validatedWithErrors', 'Validation complete, with errors.');
      return;
    }
    if (doc !== null) {
      ev.emit('error', 'Mail in use');
      ev.emit('validatedWithErrors', 'Validation complete, with errors.');
      return;
    }

    ev.emit('validated', 'Validation complete.');
  });
}

function saveRegistration(body, ev) {
  var db = mongoose.connect('mongodb://localhost/soapq');
  var Users = mongoose.model('users', users);
  mongoose.connection.on('error', function dbError(err) {
    ev.emit('dbError', 'Error connecting to database');
  });

  var now = Date.now();

  var user = new Users();
  user.email = body.mail;
  user.domain = body.domain;
  user.key = uuid.v1();
  user.created = now;
  user.updated = now;
  user.save(function onSave(err, doc) {
    if (err) {
      ev.emit('dbError', err);
      return;
    }
    ev.emit('saved', doc.key);
  });
}

