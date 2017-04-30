var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname + '/public'));

var numUsers = 0;
var usernames = {};
var arrayOfRooms = [];
var numClients = {};

io.on('connection', function (socket) {
  var addedUser = false;

  socket.on('new message', function (data) {

    socket.broadcast.to(data.room).emit('new message', {
      username: socket.username,
      message: data.message,
      longitude: data.longitude,
      latitude: data.latitude,
      image: data.image,
      timestamp: Date.now()
    });
  });

  socket.on('add user', function (username, room) {
    if (!arrayOfRooms.find(item => item === room)) {
      arrayOfRooms.push(room);
      console.log("Room skapades:", room, "Arrayen:", arrayOfRooms);
    }
    if (addedUser) return;

    socket.username = username;
    socket.room = room;
    usernames[username] = username;
    socket.join(room);
    if (numClients[room] == undefined) {
      numClients[room] = 1;
    } else {
      numClients[room]++;
    }
    ++numUsers;
    addedUser = true;
    console.log(socket.username + " has Connected to room " + room + "! " + numClients[room] + " users online here now");
    // socket.to(room).emit('user count', {
    //   numUsers: numClients[room]

    // });

    socket.broadcast.to(room).emit('user count', {
      numUsers: numClients[room]
    });

    io.to(room).emit('updateusers', usernames);
  });

  socket.on('get online users', function (room) {

    // socket.to(room).emit('user count', {
    //   numUsers: numClients[room]

    // });
    socket.broadcast.to(room).emit('user count', {
      numUsers: numClients[room]
    });
  });

  // socket.on('typing', function() {
  //   socket.broadcast.emit('typing', {
  //     username: socket.username
  //   });
  // });

  // socket.on('stop typing', function() {
  //   socket.broadcast.emit('stop typing', {
  //     username: socket.username
  //   });
  // });

  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;
      delete usernames[socket.username];
      io.to(socket.room).emit('updateusers', usernames);


      socket.broadcast.to(socket.room).emit('user count', {
        numUsers: numClients[socket.room]
      });
      numClients[socket.room]--;

      console.log(socket.username + ' has disconnected from room ' + socket.room + '! ' + numClients[socket.room] + " users online here now");

      if (numClients[socket.room] === 0) {
        arrayOfRooms.splice(arrayOfRooms.indexOf(socket.room, 1));
        console.log("That was the last user in that room so now its deleted", arrayOfRooms);
      }
    }
  });
});
