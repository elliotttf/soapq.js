/**
 * Returns a heartbeat message if everything's "ok"
 * (or at least if we think everything's ok).
 */

exports.heartbeat = function(req, res) {
  res.send('yo dawg');
};
