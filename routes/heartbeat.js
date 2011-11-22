/**
 * @fileoverview Returns a heartbeat message if everything's "ok"
 * (or at least if we think everything's ok).
 */

/**
 * Handles an incoming request.
 *
 * @param {object} req
 *   The request object.
 * @param {object} res
 *   The response object.
 */
exports.heartbeat = function(req, res) {
  res.send('yo dawg');
};

