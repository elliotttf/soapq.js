/**
 * @fileoverview Allows users to register new API keys.
 */

var SoapQUser = require('../lib/users.js').SoapQUser;

/**
 * Exports the register page.
 *
 * @param {object} req
 *   The request object.
 * @param {object} res
 *   The response object.
 */
exports.register = function(req, res) {
  var messages = {
    'notice': [],
    'warning': [],
    'error': []
  };
  var valid = false;

  if (req.method === 'POST') {
    saveNew(req, res, messages);
  }
  else {
    res.render(
      'register',
      {
        'title': 'Register API Key',
        'messages': messages
      }
    );
  }
};

/**
 * Attempts to save a new user to the database, will render
 * output with errors if there was a problem or a thank you
 * page with the new API key if all is well.
 *
 * @param {object} req
 *   The request object.
 * @param {object} res
 *   The response object.
 * @param {object} messages
 *   Object containing the messages arrays:
 *   notice, warning, and error.
 */
function saveNew(req, res, messages) {
  var user = new SoapQUser(req.body.mail, req.body.domain);
  user.validate();

  user.on('error', function pushError(err) {
    messages.error.push(err);
  });

  user.on('dbError', function dbError(err) {
    messages.error.push(err);
    res.render(
      'register',
      {
        'title': 'Register API Key',
        'messages': messages
      }
    );
  });

  user.on('validatedWithErrors', function validatedWithErrors(msg) {
    res.render(
      'register',
      {
        'title': 'Register API Key',
        'messages': messages
      }
    );
  });

  user.on('validated', function validated(msg) {
    user.save();
  });

  user.on('saved', function saved(key) {
    res.render(
      'complete',
      {
        'title': 'Thank you for registering',
        'key': key
      }
    );
  });
}

