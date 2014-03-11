/**
 * app.js
 */

// Define imports
var express = require('express');
var app = express();
var http = require('http');
var hbs = require('hbs');

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

io.sockets.on('connection', function (socket){

	function log(){
		var array = [">>> "];
	  for (var i = 0; i < arguments.length; i++) {
	  	array.push(arguments[i]);
	  }
	    socket.emit('log', array);
	}

	socket.on('message', function (message) {
		log('Got message: ', message);
		socket.broadcast.emit('message', message); // should be room only
	});

	socket.on('create or join', function (room) {
		var numClients = io.sockets.clients(room).length;

		log('Room ' + room + ' has ' + numClients + ' client(s)');
		log('Request to create or join room', room);

		if (numClients == 0){
			socket.join(room);
			socket.emit('created', room);
		} else if (numClients == 1) {
			io.sockets.in(room).emit('join', room);
			socket.join(room);
			socket.emit('joined', room);
		} else { // max two clients
			socket.emit('full', room);
		}
		socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
		socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);

	});

});

// Set the path to root
app.get('/', function(request, response) {
	response.render('index');
});