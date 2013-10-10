/**
 * app.js
 */
var app = require('express').createServer(),
	io = require('socket.io').listen(express);

var hbs = require('hbs');
var port = process.env.PORT || 3000;

var mongoose = require('mongoose');
var conn = mongoose.createConnection('mongodb://admin:admin@ds047958.mongolab.com:47958/heroku_app18466843');

app.set('view engine', 'html');
app.engine('html', hbs.__express);

// Define the static public folder for css, images, etc.
app.use(express.static('public'));

// Begin listening to the port
app.listen(port);

// Define the sockets.io callbacks
io.sockets.on('connection', function(socket) {
	
	// Define the game creation function
	socket.on('createGame', function(data) {
		
		// Create the game and return the ID to the client
		
		
	});
});

// Set the path to root
app.get('/', function(request, response) {
	response.render('index');
});

// Set the path to join a game
app.get('/game/:id', function(request, response) {
	game_id = request.params.id;

	return response.send('You entered ' + game_id);
});