'use strict';

window.onbeforeunload = function(e){ hangup(); }

// State variables
var sendChannel, receiveChannel;
var localStream, remoteStream;
var pc;

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;

// WebRTC configuration variables
let pc_config = {'iceServers': [{'url':'stun:stun.l.google.com:19302'}]};

let pc_constraints = {
    'optional': [
        {'DtlsSrtpKeyAgreement': true}
    ]
};

let sdpConstraints = {};

let constraints = {video: {width:500, height:500}, audio: true};

// Main Program
let sendButton = document.getElementById("sendButton");
let sendTextarea = document.getElementById("dataChannelSend");
let receiveTextarea = document.getElementById("dataChannelReceive");

let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");

sendButton.onclick = sendData;

var room = prompt("Enter room name:");

var socket = io();

if (room !== ""){
    console.log("Create or join room", room);
    socket.emit("create or join", room);
}

function attachMediaStream(elt, s){
    elt.srcObject = s;
}

function handleUserMedia(stream){
    localStream = stream;
    attachMediaStream(localVideo, stream);
    console.log("Adding local stream.");
    sendMessage("got user media");
}

function handleUserMediaError(error){
    console.log("getUserMedia error: ", error);
}

socket.on("created", function (room){
    console.log("Created room " + room);
    isInitiator = true;

    navigator.mediaDevices.getUserMedia(constraints)
        .then(handleUserMedia)
        .catch(handleUserMediaError);

    console.log("Getting user media with constraints", constraints);

    checkAndStart();
});

socket.on("full", function(room){
    console.log("Room " + room + " is full");
});

socket.on("join", function(room){
    console.log("Another peer made a request to join room "  + room);
    console.log("This peer is the initiator of room " + room + "!");
    isChannelReady = true;
});

socket.on("joined", function (room){
    console.log("This peer has joined room " + room);
    isChannelReady = true;

    navigator.mediaDevices.getUserMedia(constraints)
        .then(handleUserMedia)
        .catch(handleUserMediaError);

    console.log("Getting user media with constraints", constraints);
});

socket.on("log", function (array){
    console.log.apply(console, array);
});

socket.on("message", function (message){
    console.log("Received messaged:", message);
    if (message === "got user media") {
        checkAndStart();
    } else if (message.type === "offer") {
        if (!isInitiator && !isStarted) {
           checkAndStart(); 
        }
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();
    } else if (message.type === "answer" && isStarted) {
        pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type == "candidate" && isStarted) {
        let candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label, candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
    } else if (message === "bye" && isStarted) {
        handleRemoteHangup();
    }
});

function sendMessage(message){
    let transmission = {
        message: message,
        channel: room
    };
    console.log("Sending message: ", transmission);
    socket.emit("message", transmission);
}

function checkAndStart(){
    console.log("Check and start called");
    if (!isStarted && typeof localStream != "undefined" && isChannelReady){
        createPeerConnection();
        isStarted = true;
        if (isInitiator) {
            doCall();
        }
    }
}

function createPeerConnection(){
   try {
       pc = new RTCPeerConnection(pc_config, pc_constraints);
       pc.addStream(localStream);

       pc.onicecandidate = handleIceCandidate;

       console.log("Created RTCPeerConnection.");
   } catch (e) {
       console.log("Failed to create PeerConnection, exception: " + e.message);
       alert("Cannot create RTPeerConnection object.");
       return; 
   } 

    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;

    if (isInitiator) {
        try {
            sendChannel = pc.createDataChannel("sendDataChannel", {reliable: true});
            console.trace("Created send data channel");
        } catch (e) {
            alert("Failed to create data channel." + e.message);
            console.trace("createDataChannel() failed with exception: " + e.message);
        }
        sendChannel.onopen = handleSendChannelStateChange;
        sendChannel.onmessage = handleMessage;
        sendChannel.onclose = handleSendChannelStateChange;
    } else {
        pc.ondatachannel = gotReceiveChannel;
    }
}

function sendData(){
    var data = sendTextarea.value;
    if (isInitiator) {
        sendChannel.send(data);
    } else {
        receiveChannel.send(data);
    }
    console.trace("Send data: " + data);
}


// Handlers...

function gotReceiveChannel(event){
    console.trace("Receive channel callback");
    receiveChannel = event.channel;
    receiveChannel.onmessage = handleMessage;
    receiveChannel.onopen = handleReceiveChannelStateChange;
    receiveChannel.onclose = handleReceiveChannelStateChange;
}

function handleMessage(event){
    console.trace("Received message: " + event.data);
    receiveTextarea.value += event.data + "\n";
}

function handleSendChannelStateChange(){
    var readyState = sendChannel.readyState;
    console.trace("Send channel state is: " + readyState);

    if (readyState === "open") {
        dataChannelSend.disabled = false;
        dataChannelSend.focus();
        dataChannelSend.placeholder = "";
        sendButton.disabled = false;
    } else {
        dataChannelSend.disabled = true;
        sendButton.disabled = true;
    }
}

function handleReceiveChannelStateChange(){
    var readyState = receiveChannel.readyState;
    console.trace("Receive channel state is: " + readyState);

    if (readyState == "open"){
        dataChannelSend.disabled = false;
        dataChannelSend.focus();
        dataChannelSend.placeholder = "";
        sendButton.disabled = false;
    } else {
        dataChannelSend.disabled = true;
        sendButton.disabled = true;
    }
}

function handleIceCandidate(event){
    console.log("handleIceCandidate event: ", event);
    if (event.candidate) {
        sendMessage({
            type: "candidate",
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        });
    } else {
        console.log("End of candidates.");
    }
}

function doCall(){
    console.log("Creating offer...");
    pc.createOffer()
        .then(setLocalAndSendMessage)
        .catch(onSignallingError);
}

function onSignallingError(error){
    console.log("Failed to create signalling message: " + error.message);
}

function doAnswer() {
    console.log("Sending answer to peer.");
    pc.createAnswer()
        .then(setLocalAndSendMessage)
        .catch(onSignallingError);
}

function setLocalAndSendMessage(sessionDescription){
    pc.setLocalDescription(sessionDescription);
    sendMessage(sessionDescription);
}

function handleRemoteStreamAdded(event){
    console.log("Remote stream added.");

    attachMediaStream(remoteVideo, event.stream);
    console.log("Remote stream attached!!");
    remoteStream = event.stream;
}

function handleRemoteStreamRemoved(event){
    console.log("Remote stream removed. Event: ", event);
}

function hangup(){
    console.log("Hanging up");
    stop();
    sendMessage("bye");
}

function handleRemoteHangup(){
    console.log("Session terminated.");
    stop();
    isInitiator = false;
}

function stop(){
   isSTarted = false;
    if (sendChannel) {
        sendChannel.close();
    }
    if (receiveChannel) {
        receiveChannel.close()
    }
    if (pc) {
        pc.close()
    }
    pc = null;
    sendButton.disabled = true;
}
