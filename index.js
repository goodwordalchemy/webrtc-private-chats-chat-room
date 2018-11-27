var express = require('express')
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

const num_recent_messages = 30;
var recent_messages = [];

app.use(express.static('js'));
app.get('/', function (req, res){
    res.sendFile(__dirname + "/index.html");
});
app.get('/private-chat', function(req, res){
    console.log("request for private chat");
    res.sendFile(__dirname + '/private-chat.html');
});

io.on("connection", function(socket){
    console.log("user connected");

    socket.on("disconnect", function (){
        console.log("user disconnected");
    }); 

    // chat room functionality
    socket.emit('recent messages', recent_messages);

    socket.on("chat invite", (invite) => {
        console.log("got chat invite message");
        io.emit("chat invite", invite);
    });

    socket.on("chat invite response", (response) => {
        io.emit("chat invite response", response);
    });

    socket.on('chat message', function(msg){
        msg_obj = {
            username: msg.username, content: msg.content
        };

        io.emit('chat message', msg_obj);
        recent_messages.push(msg_obj);
        
        if (recent_messages.length > num_recent_messages) {
            recent_messages.shift();
        }
    });

    // webRTC functionality
    socket.on("message", function (message){
        log("S --> got message: ", message);
        socket.broadcast.to(message.channel).emit("message", message.message);
    });

    socket.on("create or join", function (room){
        var r = io.sockets.adapter.rooms[room];
        var numClients = r ? r.length : 0;

        log("S --> Room " + room + " has " + numClients + " client(s)");
        log("S --> Request to create or join room", room);

        if (numClients == 0){
            socket.join(room);
            socket.emit("created", room);
        } else if (numClients == 1){
            io.sockets.in(room).emit("join", room);
            socket.join(room);
            socket.emit("joined", room);
        } else {
            socket.emit("full", room);
        }

    });

    function log(){
        var array = [">>> "];

        array.push.apply(array, arguments);

        socket.emit("log", array);
    }
});

http.listen(3000, function (){
    console.log("listening on *:3000");
});
