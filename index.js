var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function() {
  console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname + '/public'));

var numUsers = 0;
var usernames = {};

io.on('connection', function(socket) {
  var addedUser = false;

  socket.on('new message', function(data) {
    
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data.message,
      longitude: data.longitude,
      latitude: data.latitude,
      image: data.image,
      timestamp: Date.now()
    });
  });

  socket.on('add user', function(username) {
    if (addedUser) return;

    socket.username = username;
    usernames[username] = username;
    ++numUsers;
    addedUser = true;
    console.log(socket.username + " has Connected! " + Object.keys(usernames).length + " users online");
    socket.emit('login', {
      numUsers: numUsers
      
    });
    
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
    
    io.emit('updateusers', usernames);
  });

  socket.on('typing', function() {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  socket.on('stop typing', function() {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  socket.on('disconnect', function() {
    if (addedUser) {
      --numUsers;
      delete usernames[socket.username];
      io.emit('updateusers', usernames);


      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
      console.log(socket.username + ' has disconnected! ' + Object.keys(usernames).length + " users online");
    }
  });
});
