/**
 * app.js
 */

// Define imports
var express = require('express');
var app = express();
var http = require('http');
var hbs = require('hbs');
var redis = require('redis');
var url = require('url');

var DEBUG = false;

if (!DEBUG) {
	var redisUrl = url.parse(process.env.REDIS_URL);
	var client = redis.createClient(redisUrl.port, redisUrl.hostname, {
		no_ready_check : true
	});
} else {
	var client = redis.createClient();
}

if (!DEBUG) {
	client.auth(redisUrl.auth.split(":")[1]);
}

/* Configure the Express server */
app.configure(function() {
	app.set('port', process.env.PORT || 3000);
	app.set('view engine', 'html');
	app.engine('html', hbs.__express);
	app.use(express.static('public'));
});

/* Configure the dev ENV */
app.configure('development', function() {
	app.use(express.errorHandler());
});

/* Create the HTTP server used by socket.io */
var server = http.createServer(app).listen(app.get('port'), function() {
	console.log('Express listening on ' + app.get('port'));
}), io = require('socket.io').listen(server);

// Define the sockets.io callbacks
io.sockets.on('connection', function(socket) {

	// Define the game creation function
	socket.on('requestOpponent', function(data) {

		client.get('availableClient', function(err, webRtcDesc) {
			if (!webRtcDesc) {
				client.set('availableClient', data, function(err) {
					if (err)
						throw err;
					console.log('Available client is now: ' + data);
				});
			} else {
				/*
				 * A client is already available and we must transmit details to
				 * each
				 */
				console.log('A client is available: ' + webRtcDesc);
				client.del('availableClient');

				io.sockets.socket(socket.id).emit('opponent', webRtcDesc);
			}
		});
	});
});

// Set the path to root
app.get('/', function(request, response) {
	response.render('index');
});