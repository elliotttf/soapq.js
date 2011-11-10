/**
 * Simple node.js server to handle SOAP requests
 * asynchronously.
 */

var app = express.createServer();

function validate(query) {
  if (typeof query['key'] == 'undefined') {
    return false;
  }
}

app.get('/', function(req, res) {
  console.log('Handling request.');
  var dest = url.parse(req.url, true);

  if (!validate(dest.query)) {
    console.log('Malformed request.');
    res.render('error', { status: 500, message: 'Malformed request.' });
    return;
  }

  res.send('Yo!');
});

app.listen(1337);
console.log('Started server.');
