/**
 * app.js
 */

// Define imports
var express = require('express'),
	app = express(), 
	io = require('socket.io').listen(app),
	hbs = require('hbs'),
	redis = require('redis'),
	url = require('url');

var port = process.env.PORT || 3000;
var redisUrl = url.parse(process.env.REDIS_URL);

var client = redis.createClient(redisUrl.port, 
								redisUrl.hostname, 
								{no_ready_check: true});

client.auth(redisUrl.auth.split(":")[1]);

app.set('view engine', 'html');
app.engine('html', hbs.__express);

// Define the static public folder for css, images, etc.
app.use(express.static('public'));

// Begin listening to the port
app.listen(port);

// Define the sockets.io callbacks
io.sockets.on('connection', function(socket) {

	// Define the game creation function
	socket.on('requestOpponent', function(data) {

		var opponent = client.get('availableClient');
		client.get('availableClient', function (err, socketId) {
			if (err) {
				client.set('availableClient', socket.id, function(err) {
					if (err) throw err;
					console.log('Available client is now: ' + socket.id);
				});
			} else {
				console.log('A client is available: ' + opponent);
			}
		});
	});
});

// Set the path to root
app.get('/', function(request, response) {
	response.render('index');
});