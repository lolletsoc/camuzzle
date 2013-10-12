/* */

window.onload = function() {
	var socket = io.connect('http://localhost');
	socket.on('requestOpponent', function(data) {
		console.log(data);
		socket.emit('webRtcInfo', {
			my : 'data'
		});
	});
};