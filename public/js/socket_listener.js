/* */

window.onload = function() {
	var socket = io.connect('http://camuzzle.herokuapp.com');
	socket.emit('requestOpponent', {
		my : 'data'
	});
};