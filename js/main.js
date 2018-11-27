var USERNAME;

var socket = io();

function renderMessage(msg) {
    let link = `/private-chat?initiator=${msg.username}`;

    $('#messages').append(
        $('<li/>').append(
            $('<a/>')
            .attr('href', link)
            .text(`${msg.username}`))
        .text(`${msg.content}`));
}




$(function () {
    $("#messages").on("click", function(evt){
        console.log("clicked!", evt.target);
    });

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
});
