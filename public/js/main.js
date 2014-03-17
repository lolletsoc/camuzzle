'use strict';

var FPS = 33;

var sendChannel;

var isChannelReady;
var isInitiator;
var isStarted;
var localStream;
var pc;
var remoteStream;
var turnReady;

var pc_config = webrtcDetectedBrowser === 'firefox' ? {
	'iceServers' : [ {
		'url' : 'stun:23.21.150.121'
	} ]
} : // number IP
{
	'iceServers' : [ {
		'url' : 'stun:stun.l.google.com:19302'
	} ]
};

var pc_constraints = {
	'optional' : [ {
		'DtlsSrtpKeyAgreement' : true
	}, {
		'RtpDataChannels' : true
	} ]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
	'mandatory' : {
		'OfferToReceiveAudio' : true,
		'OfferToReceiveVideo' : true
	}
};

// ///////////////////////////////////////////

var room = location.pathname.substring(1);
if (room === '') {
	// room = prompt('Enter room name:');
	room = 'foo';
} else {
	//
}

var socket = io.connect('http://127.0.0.1:3000');

if (room !== '') {
	console.log('Create or join room', room);
	socket.emit('create or join', room);
}

socket.on('created', function(room) {
	console.log('Created room ' + room);
	isInitiator = true;
});

socket.on('full', function(room) {
	console.log('Room ' + room + ' is full');
});

socket.on('join', function(room) {
	console.log('Another peer made a request to join room ' + room);
	console.log('This peer is the initiator of room ' + room + '!');
	isChannelReady = true;
});

socket.on('joined', function(room) {
	console.log('This peer has joined room ' + room);
	isChannelReady = true;
});

socket.on('log', function(array) {
	console.log.apply(console, array);
});

// //////////////////////////////////////////////

function sendMessage(message) {
	console.log('Sending message: ', message);
	socket.emit('message', message);
}

socket.on('message', function(message) {
	console.log('Received message:', message);
	if (message === 'got user media') {
		maybeStart();
	} else if (message.type === 'offer') {
		if (!isInitiator && !isStarted) {
			maybeStart();
		}
		pc.setRemoteDescription(new RTCSessionDescription(message));
		doAnswer();
	} else if (message.type === 'answer' && isStarted) {
		pc.setRemoteDescription(new RTCSessionDescription(message));
	} else if (message.type === 'candidate' && isStarted) {
		var candidate = new RTCIceCandidate({
			sdpMLineIndex : message.label,
			candidate : message.candidate
		});
		pc.addIceCandidate(candidate);
	} else if (message === 'bye' && isStarted) {
		handleRemoteHangup();
	}
});

// //////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

var localVideoPieceArray;
var remoteVideoPieceArray;

var numberOfPieces = 4;

function randomSort(a, b) {
	// TODO: This is shit, change it.
	var temp = Math.floor(Math.random() * 10);
	var isOddOrEven = temp % 2;
	var isPosOrNeg = temp > 5 ? 1 : -1;
	return (isOddOrEven * isPosOrNeg);
}

var localVideoRandomPieces = new Array(0, 1, 2, 3).sort(randomSort);
var gridWays = localVideoRandomPieces.length / 2;

var x;
var y;

/*
 * Canvas matrix defines a [[], []] of row,column mappings against the canvas
 * container
 */
var canvasMatrix = [
		[document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas')],
		[document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas')],
		[document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas')],
		[document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas')],
];

function calculatePieceSizes() {
	x = Math.floor(localVideo.videoWidth / canvasMatrix.length);
	y = Math.floor(localVideo.videoHeight / canvasMatrix.length);
}

function createIsotopeContainer() {
	var $container = $('#localPieceContainer').isotope({
    layoutMode: 'fitColumns',
		itemSelector: '.item',
    resizesContainer: false
  });
}

function addElementsToIsotopeContainer() {
	var $container = $('#localPieceContainer');
	var len = canvasMatrix.length

	for (var i = 0; i < len; i++) {
		for (var k = 0;k < len; k++) {
			var canvas = canvasMatrix[i][k];
			$container.append(canvas).isotope( 'appended', canvas);
		}
	}
}

function drawPiecesOfVideo() {
	// TODO: Requires refactoring - must change name.
	var dy;
	var dx;
	var len = canvasMatrix.length
	for (var i = 0; i < len; i++) {
		dx = x * i;
		// Rows
		for (var k = 0; k < len; k++) {
			dy = y * k;
			canvasMatrix[i][k].getContext('2d').drawImage(localVideo, dx,
					dy, x, y, 0, 0, x, y);
		}
	}
}

function handleUserMedia(stream) {
	localStream = stream;
	attachMediaStream(localVideo, stream);

	createIsotopeContainer();
	addElementsToIsotopeContainer();
	calculatePieceSizes();
	setInterval(drawPiecesOfVideo, 33);

	console.log('Adding local stream.');
	sendMessage('got user media');
	if (isInitiator) {
		maybeStart();
	}
}

function handleUserMediaError(error) {
	console.log('getUserMedia error: ', error);
}

var constraints = {
	video : true
};

getUserMedia(constraints, handleUserMedia, handleUserMediaError);
console.log('Getting user media with constraints', constraints);
	setInterval(drawPiecesOfVideo, FPS);

function maybeStart() {
	if (!isStarted && localStream && isChannelReady) {
		createPeerConnection();
		pc.addStream(localStream);
		isStarted = true;
		if (isInitiator) {
			doCall();
		}
	}
}

window.onbeforeunload = function(e) {
	sendMessage('bye');
};

// ///////////////////////////////////////////////////////

function createPeerConnection() {
	try {
		pc = new RTCPeerConnection(pc_config, pc_constraints);
		pc.onicecandidate = handleIceCandidate;
		console.log('Created RTCPeerConnnection with:\n' + '  config: \''
				+ JSON.stringify(pc_config) + '\';\n' + '  constraints: \''
				+ JSON.stringify(pc_constraints) + '\'.');
	} catch (e) {
		console.log('Failed to create PeerConnection, exception: ' + e.message);
		alert('Cannot create RTCPeerConnection object.');
		return;
	}
	pc.onaddstream = handleRemoteStreamAdded;
	pc.onremovestream = handleRemoteStreamRemoved;

	if (isInitiator) {
		try {
			// Reliable Data Channels not yet supported in Chrome
			sendChannel = pc.createDataChannel("sendDataChannel", {
				reliable : true
			});
			sendChannel.onmessage = handleMessage;
			trace('Created send data channel');
		} catch (e) {
			alert('Failed to create data channel. '
					+ 'You need Chrome M25 or later with RtpDataChannel enabled');
			trace('createDataChannel() failed with exception: ' + e.message);
		}
		sendChannel.onopen = handleSendChannelStateChange;
		sendChannel.onclose = handleSendChannelStateChange;
	} else {
		pc.ondatachannel = gotReceiveChannel;
	}
}

function gotReceiveChannel(event) {
	trace('Receive Channel Callback');
	sendChannel = event.channel;
	sendChannel.onmessage = handleMessage;
	sendChannel.onopen = handleReceiveChannelStateChange;
	sendChannel.onclose = handleReceiveChannelStateChange;
}

function handleSendChannelStateChange() {
	var readyState = sendChannel.readyState;
	trace('Send channel state is: ' + readyState);
	enableMessageInterface(readyState == "open");
}

function handleReceiveChannelStateChange() {
	var readyState = sendChannel.readyState;
	trace('Receive channel state is: ' + readyState);
	enableMessageInterface(readyState == "open");
}

function enableMessageInterface(shouldEnable) {
	if (shouldEnable) {
		dataChannelSend.disabled = false;
		dataChannelSend.focus();
		dataChannelSend.placeholder = "";
		sendButton.disabled = false;
	} else {
		dataChannelSend.disabled = true;
		sendButton.disabled = true;
	}
}

function handleIceCandidate(event) {
	console.log('handleIceCandidate event: ', event);
	if (event.candidate) {
		sendMessage({
			type : 'candidate',
			label : event.candidate.sdpMLineIndex,
			id : event.candidate.sdpMid,
			candidate : event.candidate.candidate
		});
	} else {
		console.log('End of candidates.');
	}
}

function handleRemoteStreamAdded(event) {
	console.log('Remote stream added.');
	// reattachMediaStream(miniVideo, localVideo);
	attachMediaStream(remoteVideo, event.stream);
	remoteStream = event.stream;
	// waitForRemoteVideo();
}

function doCall() {
	var constraints = {
		'optional' : [],
		'mandatory' : {
			'MozDontOfferDataChannel' : true
		}
	};
	// temporary measure to remove Moz* constraints in Chrome
	if (webrtcDetectedBrowser === 'chrome') {
		for ( var prop in constraints.mandatory) {
			if (prop.indexOf('Moz') !== -1) {
				delete constraints.mandatory[prop];
			}
		}
	}
	constraints = mergeConstraints(constraints, sdpConstraints);
	console.log('Sending offer to peer, with constraints: \n' + '  \''
			+ JSON.stringify(constraints) + '\'.');
	pc.createOffer(setLocalAndSendMessage, null, constraints);
}

function doAnswer() {
	console.log('Sending answer to peer.');
	pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
}

function mergeConstraints(cons1, cons2) {
	var merged = cons1;
	for ( var name in cons2.mandatory) {
		merged.mandatory[name] = cons2.mandatory[name];
	}
	merged.optional.concat(cons2.optional);
	return merged;
}

function setLocalAndSendMessage(sessionDescription) {
	// Set Opus as the preferred codec in SDP if Opus is present.
	sessionDescription.sdp = preferOpus(sessionDescription.sdp);
	pc.setLocalDescription(sessionDescription);
	sendMessage(sessionDescription);
}

function handleRemoteStreamAdded(event) {
	console.log('Remote stream added.');
	// reattachMediaStream(miniVideo, localVideo);
	attachMediaStream(remoteVideo, event.stream);
	remoteStream = event.stream;
	// waitForRemoteVideo();
}
function handleRemoteStreamRemoved(event) {
	console.log('Remote stream removed. Event: ', event);
}

function hangup() {
	console.log('Hanging up.');
	stop();
	sendMessage('bye');
}

function handleRemoteHangup() {
	console.log('Session terminated.');
	stop();
	isInitiator = false;
}

function stop() {
	isStarted = false;
	// isAudioMuted = false;
	// isVideoMuted = false;
	pc.close();
	pc = null;
}

// /////////////////////////////////////////

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
	var sdpLines = sdp.split('\r\n');
	var mLineIndex = null;
	// Search for m line.
	for (var i = 0; i < sdpLines.length; i++) {
		if (sdpLines[i].search('m=audio') !== -1) {
			mLineIndex = i;
			break;
		}
	}
	if (mLineIndex === null) {
		return sdp;
	}

	// If Opus is available, set it as the default in m line.
	for (i = 0; i < sdpLines.length; i++) {
		if (sdpLines[i].search('opus/48000') !== -1) {
			var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
			if (opusPayload) {
				sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex],
						opusPayload);
			}
			break;
		}
	}

	// Remove CN in m line and sdp.
	sdpLines = removeCN(sdpLines, mLineIndex);

	sdp = sdpLines.join('\r\n');
	return sdp;
}

function extractSdp(sdpLine, pattern) {
	var result = sdpLine.match(pattern);
	return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
	var elements = mLine.split(' ');
	var newLine = [];
	var index = 0;
	for (var i = 0; i < elements.length; i++) {
		if (index === 3) { // Format of media starts from the fourth.
			newLine[index++] = payload; // Put target payload to the first.
		}
		if (elements[i] !== payload) {
			newLine[index++] = elements[i];
		}
	}
	return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
	var mLineElements = sdpLines[mLineIndex].split(' ');
	// Scan from end for the convenience of removing an item.
	for (var i = sdpLines.length - 1; i >= 0; i--) {
		var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
		if (payload) {
			var cnPos = mLineElements.indexOf(payload);
			if (cnPos !== -1) {
				// Remove CN payload from m line.
				mLineElements.splice(cnPos, 1);
			}
			// Remove CN line in sdp
			sdpLines.splice(i, 1);
		}
	}

	sdpLines[mLineIndex] = mLineElements.join(' ');
	return sdpLines;
}
