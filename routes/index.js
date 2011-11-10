/**
 * GET home page.
 */

exports.request = require('./request.js').request;

exports.index = function(req, res){
  res.render('index', { title: 'soapq.js' })
};
