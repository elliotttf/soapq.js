/**
 * @fileoverview GET home page.
 */

/**
 * Defines the heartbeat page.
 */
exports.heartbeat = require('./heartbeat.js').heartbeat;

/**
 * Defines the request page.
 */
exports.request = require('./request.js').request;

/**
 * Handles an incoming request.
 *
 * @param {object} req
 *   The request object.
 * @param {object} res
 *   The response object.
 */
exports.index = function(req, res) {
  res.render('index', { title: 'soapq.js' });
};

