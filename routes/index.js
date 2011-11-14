/**
 * GET home page.
 */

exports.heartbeat = require('./heartbeat.js').heartbeat;
exports.request = require('./request.js').request;

exports.index = function(req, res){
  res.render('index', { title: 'soapq.js' })
};
