var USERNAME;

var socket = io();

function renderMessage(msg) {
    let link = `/private-chat?initiator=${msg.username}`;

    $('#messages').append(
        $('<li/>').append(
            $('<a/>')
            .attr('href', link)
            .on("click", function(evt){
                evt.preventDefault();
                if (msg.username === USERNAME) {
                    alert("you can't start a chat with yourself!");
                    return false;
                }
                socket.emit("chat invite", {from: USERNAME, to: `${msg.username}`});
            })
            .text(`${msg.username}`))
        .append(`: ${msg.content}`));
}

$(function () {
    $(".user-link")

    $('form').submit(function(){
        if (USERNAME) {
            socket.emit('chat message', {content: $('#m').val(), username: USERNAME});
            $('#m').val('');
        } else {
            if ($('#m').val() === '') {
            } else {
                USERNAME = $('#m').val();
                $('#b').text("Send");
                $('#m').val('')
            }
        }
        return false;
    });

    socket.on('recent messages', function(msgs){
        msgs.map(renderMessage);
    });

    socket.on('chat message', function(msg){
        renderMessage(msg);
        window.scrollTo(0, document.body.scrollHeight);
    });

    socket.on("chat invite", ({from, to}) => {
        if (USERNAME === from){
            $("#header").append("Awating response from invitee...");
        }
        else if (USERNAME === to){
            $("#header").append(
                $("<div/>")
                .append(`You have been invited to a chat with ${from}`)
                .append(
                    $("<button>yes</button>")
                    .on("click", function(evt){
                        socket.emit("chat invite response", {from: from, to: to, response: true});
                    }))
                .append(
                    $("<button>no</button>")
                    .on("click", function(evt){
                        socket.emit("chat invite response", {from: from, to: to, response: false});
                    })
                ));
        }
    });

    socket.on("chat invite response", (response) => {
        let link = `/private-chat?initiator=${response.from}`;

        if (response.from === USERNAME){
            if (response.response){
                window.location = link;
            }
            else {
                alert("Your invitation was denied");
            }
        }
        else if (response.to == USERNAME && response.response) {
            console.log("You are the invited user and you reponded yes");
            window.location = link;
        }
    });
});
