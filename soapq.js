/**
 * Simple node.js server to handle SOAP requests
 * asynchronously.
 */

var http = require('http');
var url = require('url');

function validate(query) {
  if (typeof query['key'] == 'undefined') {
    return false;
  }
}

function onRequest(req, res) {
  console.log('Handling request.');
  var dest = url.parse(req.url, true);

  if (!validate(dest.query)) {
    console.log('Malformed request.');
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.write('Malformed request.');
    res.end();
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Yo!');
  res.end();
}

http.createServer(onRequest).listen(1337, '172.16.124.128');
console.log('Started server.');
