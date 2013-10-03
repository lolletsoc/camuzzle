/**
 * app.js
 */
var express = require('express');
var app = express();
var hbs = require('hbs');

app.set('view engine', 'html');
app.engine('html', hbs.__express);

// Define the static public folder for css, images, etc.
app.use(express.static('public'));

app.listen(80);

app.get('/', function(request, response) {
	response.render('index');
});