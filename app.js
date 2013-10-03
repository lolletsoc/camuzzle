/**
 * app.js
 */
var express = require('express');
var app = express();
var hbs = require('hbs');
var port = process.env.PORT || 3000;

app.set('view engine', 'html');
app.engine('html', hbs.__express);

// Define the static public folder for css, images, etc.
app.use(express.static('public'));

// Begin listening to the port
app.listen(port);

// Set the path to root
app.get('/', function(request, response) {
	response.render('index');
});

app.get('/game/:id', function(request, response) {
	game_id = request.params.id;
	return response.send('You entered ' + game_id);
});