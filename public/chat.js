$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#FF0000',
    '#00FFFF', '#C0C0C0',
    '#0000FF', '#808080',
    '#0000A0', '#000000',
    '#ADD8E6', '#FFA500',
    '#800080', '#A52A2A',
    '#FFFF00', '#800000',
    '#00FF00', '#008000',
    '#FF00FF', '#808000',
  ];


  var $window = $(window);
  var $usernameInput = $('.usernameInput');
  var $messages = $('.messages');
  var $inputMessage = $('.form-control');

  var $loginPage = $('.login.page');
  var $chatPage = $('.chat.page');
  var $send = $('#sendIt');

  var $longitude = $('#lon');
  var $latitude = $('#lat');
  var $error = $('#error');
  var radius = $('#radius').val();

  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  var socket = io();

  $send.click(function() {
    sendMessage();
  });

  socket.on('updateusers', function(data) {

    $('#users').empty();

    $.each(data, function(key, value) {
      var color = getUsernameColor(key);

      $('#users').append('<div style=color:' + color + '>' + key + '</div>');

    });

  });

//   $(function () {


//   var cities;
//   var totalNumberOfUsers;

//   var socket = io();

//   $(window).load(function () {
//     socket.emit('connection');
//     socket.emit('total count');

//     socket.on('total counts', function (data) {
//       console.log(data);
//       totalNumberOfUsers = data.count;
//       cities = data.cities;
//     });
//   });
// });

  $(window).load(function () {
    username = cleanInput($usernameInput.val().trim());

    if (!$error.text()) {
      if (username) {
        $loginPage.fadeOut();
        $chatPage.show();
        $loginPage.off('click');
        $currentInput = $inputMessage.focus();

        socket.emit('add user', username, 'Örebro');
      }
    }
  });

  function sendMessage() {
    var message = $inputMessage.val();
    var longitude = $longitude.text();
    var latitude = $latitude.text();
    message = cleanInput(message);

    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message,
        longitude: longitude,
        latitude: latitude,
        timestamp: Date.now()

      });

      socket.emit('new message', {
        room: 'Örebro',
        username: username,
        message: message,
        longitude: longitude,
        latitude: latitude,
        timestamp: Date.now()
      });
    }
  }

  function addChatMessage(data, options) {
    var $typingMessages = getTypingMessages(data);
    options = options || {};

    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var lat1 = parseFloat($latitude.text());
    var lon1 = parseFloat($longitude.text());
    var lat2 = parseFloat(data.latitude);
    var lon2 = parseFloat(data.longitude);

    var round = Math.round(distance(lat1, lon1, lat2, lon2) * 10) / 10;
    var doubleRadius = radius + ".00";

    if (parseFloat(round) < parseFloat(doubleRadius)) {
      var $timestampDiv = $('<span class="timestamp"/>')
        .text(" " + round + "m away | " + formatDate(data.timestamp));
      var $usernameDiv = $('<span class="username"/>')
        .text(data.username + ": ")
        .css('color', getUsernameColor(data.username));
      var $messageBodyDiv = $('<span class="messageBody">')
        .text(data.message);

      var typingClass = data.typing ? 'typing' : '';
      var $messageDiv = $('<div class="message"/>')
        .data('username', data.username)
        .addClass(typingClass)
        .append($usernameDiv, $messageBodyDiv)
        .append($timestampDiv, $messageBodyDiv);

      addMessageElement($messageDiv, options);
    }
  }

  function formatDate(dateObj) {
    var d = new Date(dateObj);
    var hours = d.getHours();
    var minutes = d.getMinutes().toString();

    return hours + ":" + (minutes.length === 1 ? '0' + minutes : minutes);
  }

  function distance(lat1, lon1, lat2, lon2) {
    var deg2rad = 0.017453292519943295; // === Math.PI / 180
    var cos = Math.cos;
    lat1 *= deg2rad;
    lon1 *= deg2rad;
    lat2 *= deg2rad;
    lon2 *= deg2rad;
    var diam = 12742000; // Diameter of the earth in km (2 * 6371)
    var dLat = lat2 - lat1;
    var dLon = lon2 - lon1;
    var a = (
      (1 - cos(dLat)) +
      (1 - cos(dLon)) * cos(lat1) * cos(lat2)
    ) / 2;

    return diam * Math.asin(Math.sqrt(a));
  }

  function addChatTyping(data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function() {
      $(this).remove();
    });
  }

  function addMessageElement(el, options) {
    var $el = $(el);

    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    }
    else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  function cleanInput(input) {
    return $('<div/>').text(input).text();
  }

  function updateTyping() {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function() {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  function getTypingMessages(data) {
    return $('.typing.message').filter(function(i) {
      return $(this).data('username') === data.username;
    });
  }

  function getUsernameColor(username) {
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  $window.keydown(function(event) {

    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }

    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      }
      else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  $loginPage.click(function() {
    $currentInput.focus();
  });

  $inputMessage.click(function() {
    $inputMessage.focus();
  });

  socket.on('login', function(data) {
    connected = true;
  });

  socket.on('new message', function(data) {
    addChatMessage(data);
  });

  socket.on('user left', function(data) {
    removeChatTyping(data);
  });

  socket.on('typing', function(data) {
    addChatTyping(data);
  });

  socket.on('stop typing', function(data) {
    removeChatTyping(data);
  });
});
