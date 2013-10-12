/* */

window.onload = function() {
	var socket = io.connect('http://127.0.0.1');
	socket.emit('requestOpponent', {
		my : 'data'
	});
};