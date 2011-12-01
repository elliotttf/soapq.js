
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var pre = require('./preprocess.js');

var app = module.exports = express.createServer();

// Configuration.
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function() {
  app.use(express.errorHandler());
});

// Process any pending requests.
pre.process();

/**
 * Routes.
 */
app.get('/', routes.index);

// Returns a heartbeat message.
app.get('/heartbeat', routes.heartbeat);

// Accepts an incoming request.
app.get('/request', routes.request);
app.post('/request', routes.request);

// Allows users to register new API keys.
app.get('/register', routes.register);
app.post('/register', routes.register);

app.listen(3000);
console.log('soapq.js server listening on port %d in %s mode', app.address().port, app.settings.env);
