// Acquire the getUserMedia depending on the current client
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// Constraints of the MediaStream
var constraints = {audio: false, video: true};
var video = document.querySelector("video");

// Callback on Success of the MediaStream
function successCallback(stream) {
  window.stream = stream; // stream available to console
  if (window.URL) {
    video.src = window.URL.createObjectURL(stream);
  } else {
    video.src = stream;
  }
  video.play();
}

// Callback on Error of the MediaStream
function errorCallback(error){
  console.log("navigator.getUserMedia error: ", error);
}

// The actual call to 'getUserMedia'
navigator.getUserMedia(constraints, successCallback, errorCallback);