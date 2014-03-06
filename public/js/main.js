// Acquire the getUserMedia depending on the current client
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
		|| navigator.mozGetUserMedia;

// Constraints of the MediaStream
var constraints = {
	audio : false,
	video : true
};

var DEBUG = false;
var localVideo, remoteVideo;

window.onload = function() {
	localVideo = document.getElementById("localVideo");
	remoteVideo = document.getElementById("remoteVideo");
};

if (!DEBUG) {
	var socket = io.connect('http://camuzzle.herokuapp.com');
} else {
	var socket = io.connect('http://127.0.0.1');
}

socket.on('opponent', function(desc) {
	console.log(desc);
	
	var sdp = JSON.parse(desc);
	
	remotePeerConnection.setRemoteDescription(sdp);
	remotePeerConnection.createAnswer(gotRemoteDescription);
});

// Callback on Success of the MediaStream
function successCallback(stream) {

	window.stream = stream;
	if (window.URL) {
		localVideo.src = window.URL.createObjectURL(stream);
	} else {
		localVideo.src = stream;
	}
	localVideo.play();

	servers = {
		"iceServers" : [ {
			"url" : "stun:stun.l.google.com:19302"
		} ]
	};

	localPeerConnection = new webkitRTCPeerConnection(servers);
	console.log("Created local peer connection object localPeerConnection");
	localPeerConnection.onicecandidate = gotLocalIceCandidate;

	remotePeerConnection = new webkitRTCPeerConnection(servers);
	console.log("Created remote peer connection object remotePeerConnection");
	remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
	remotePeerConnection.onaddstream = gotRemoteStream;

	localPeerConnection.addStream(stream);
	console.log("Added localStream to localPeerConnection");
	localPeerConnection.createOffer(gotLocalDescription);
}

function gotLocalDescription(description) {
	localPeerConnection.setLocalDescription(description);
	console.log("Offer from localPeerConnection: \n" + description.sdp);
	
	var sdp = JSON.stringify(description.sdp);
	
	socket.emit('requestOpponent', sdp);
}

function gotRemoteDescription(description) {
	remotePeerConnection.setLocalDescription(description);
	console.log("Answer from remotePeerConnection: \n" + description.sdp);
	localPeerConnection.setRemoteDescription(new RTCSessionDescription(description));
}

function gotRemoteStream(event) {
	remoteVideo.src = URL.createObjectURL(event.stream);
	console.log("Received remote stream");
}

function gotLocalIceCandidate(event) {
	if (event.candidate) {
		remotePeerConnection.addIceCandidate(new RTCIceCandidate(
				event.candidate));
	}
}

function gotRemoteIceCandidate(event) {
	if (event.candidate) {
		localPeerConnection
				.addIceCandidate(new RTCIceCandidate(event.candidate));
		console.log("Remote ICE candidate: \n " + event.candidate.candidate);
	}
}

// Callback on Error of the MediaStream
function errorCallback(error) {
	console.log("navigator.getUserMedia error: ", error);
}

// The actual call to 'getUserMedia'
navigator.getUserMedia(constraints, successCallback, errorCallback);