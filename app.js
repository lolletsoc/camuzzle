/**
 * app.js
 */

// Define imports
var express = require('express'),
	app = express(),
	http = require('http'),
	hbs = require('hbs'),
	redis = require('redis'),
	url = require('url');

var redisUrl = url.parse(process.env.REDIS_URL);

var client = redis.createClient(redisUrl.port, 
								redisUrl.hostname, 
								{no_ready_check: true});

client.auth(redisUrl.auth.split(":")[1]);

/* Configure the Express server*/
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

io.configure(function() {
	io.set("transports", [ "xhr-polling" ]);
	io.set("polling duration", 10);
});

// Define the sockets.io callbacks
io.sockets.on('connection', function(socket) {

	// Define the game creation function
	socket.on('requestOpponent', function(data) {

		client.get('availableClient', function(err, socketId) {
			if (socketId) {
				client.set('availableClient', socket.id, function(err) {
					if (err)
						throw err;
					console.log('Available client is now: ' + socket.id);
				});
			} else {
				/* A client is already available and we must transmit details to each */
				console.log('A client is available: ' + socketId);
				socket.emit('opponent', {
					'client': socketId
				});
				
				io.sockets.socket(socketId).emit('opponent', {
					'client': socket.id
				});
			}
		});
	});
});

// Set the path to root
app.get('/', function(request, response) {
	response.render('index');
});