console.log("loaded new main");
      function renderMessage(msg) {
          let link = "/private-chat";


          $('#messages').append(
              $(`<li><a class="privateChatLink" href="${link}?initiator=${msg.username}">${msg.username}</a>: ${msg.content}</li>`)
          );
      }

      var USERNAME;

      $(function () {
        var socket = io();
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
