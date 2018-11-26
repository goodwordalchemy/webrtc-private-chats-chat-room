var express = require('express')
var app = express();
var http = require("http").Server(app);
var io = require("socket.io").listen(http);

http.listen(3000, function (){
    console.log("listening on *:3000");
});

app.use(express.static('js'));

app.get('/', function (req, res){
    res.sendFile(__dirname + "/index.html");
});

io.on("connection", function(socket){
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

        for (var i = 0, len = arguments.length; i < len; i++) {
            array.push(arguments[i]);
        }

        socket.emit("log", array);
    }
});
