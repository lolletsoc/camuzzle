// Acquire the getUserMedia depending on the current client
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
		|| navigator.mozGetUserMedia;

// Constraints of the MediaStream
var constraints = {
	audio : false,
	video : true
};

var localVideo = document.querySelector("localVideo");
var remoteVideo = document.querySelector("remoteVideo");
var socket = io.connect('http://camuzzle.herokuapp.com');

// Callback on Success of the MediaStream
function successCallback(stream) {

	window.stream = stream;
	if (window.URL) {
		localVideo.src = window.URL.createObjectURL(stream);
	} else {
		localVideo.src = stream;
	}
	localVideo.play();

	localPeerConnection = new webkitRTCPeerConnection(servers);
	trace("Created local peer connection object localPeerConnection");
	localPeerConnection.onicecandidate = gotLocalIceCandidate;

	remotePeerConnection = new webkitRTCPeerConnection(servers);
	trace("Created remote peer connection object remotePeerConnection");
	remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
	remotePeerConnection.onaddstream = gotRemoteStream;

	localPeerConnection.addStream(localStream);
	trace("Added localStream to localPeerConnection");
	localPeerConnection.createOffer(gotLocalDescription);

	// Define the sockets.io callbacks
	io.sockets.on('connection', function(socket) {

		// Define the game creation function
		socket.on('requestOpponent', function(data) {

			client.get('availableClient', function(err, webRtcDesc) {
				if (!webRtcDesc) {
					client.set('availableClient', webRtcDesc, function(err) {
						if (err)
							throw err;
						console.log('Available client is now: ' + webRtcDesc);
					});
				} else {
					/*
					 * A client is already available and we must transmit
					 * details to each
					 */
					console.log('A client is available: ' + webRtcDesc);
					socket.emit('opponent', {
						'client' : webRtcDesc
					});
					client.del('availableClient');

					io.sockets.socket(socketId).emit('opponent', {
						'client' : webRtcDesc
					});
				}
			});
		});
	});
}

function gotLocalDescription(description) {
	localPeerConnection.setLocalDescription(description);
	trace("Offer from localPeerConnection: \n" + description.sdp);

	socket.emit('requestOpponent', {
		'desc' : JSON.stringify(description)
	});

	remotePeerConnection.setRemoteDescription(description);
	remotePeerConnection.createAnswer(gotRemoteDescription);
}

function gotRemoteDescription(description) {
	remotePeerConnection.setLocalDescription(description);
	trace("Answer from remotePeerConnection: \n" + description.sdp);
	localPeerConnection.setRemoteDescription(description);
}

function gotRemoteStream(event) {
	remoteVideo.src = URL.createObjectURL(event.stream);
	trace("Received remote stream");
}

function gotLocalIceCandidate(event) {
	if (event.candidate) {
		remotePeerConnection.addIceCandidate(new RTCIceCandidate(
				event.candidate));
		trace("Local ICE candidate: \n" + event.candidate.candidate);
	}
}

function gotRemoteIceCandidate(event) {
	if (event.candidate) {
		localPeerConnection
				.addIceCandidate(new RTCIceCandidate(event.candidate));
		trace("Remote ICE candidate: \n " + event.candidate.candidate);
	}
}

// Callback on Error of the MediaStream
function errorCallback(error) {
	console.log("navigator.getUserMedia error: ", error);
}

// The actual call to 'getUserMedia'
navigator.getUserMedia(constraints, successCallback, errorCallback);