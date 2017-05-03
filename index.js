var allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

  // intercept OPTIONS method
  if ('OPTIONS' == req.method) {
    console.log('hit options');
    res.send(200);
  }
  else {
    next();
  }
};


var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

// const aws = require('aws-sdk');

// let s3 = new aws.S3({
//   accessKeyId: process.env.FACEBOOK_APP_ID,
//   secretAccessKey: process.env.FACEBOOK_SECRET
// });

var id = process.env.FACEBOOK_ID;
var sevret = process.env.FACEBOOK_SECRET;



server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname + '/public'));
app.use(allowCrossDomain);

var request = require('request');


var numUsers = 0;
var usernames = {};
var arrayOfRooms = [];

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

  socket.on('request keys', function () {
    console.log('https://graph.facebook.com/oauth/access_token?client_id=' + id + '&client_secret=' + sevret + '&grant_type=client_credentials');
    request('https://graph.facebook.com/oauth/access_token?client_id=' + id + '&client_secret=' + sevret + '&grant_type=client_credentials', function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var info = JSON.parse(body)
        socket.emit('event keys', {
          data: info.access_token
        });
      }
    })
  });

  socket.on('request login', function (username) {
    if (usernames[username]) {
      socket.emit('login fail', username);
    }
    else {
      socket.emit('login success', username);
    }
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
    ++numUsers;
    addedUser = true;
    console.log(socket.username + " has Connected to room " + room + "! " + io.sockets.adapter.rooms[room].length + " users online here now");

    // var c = io.sockets.adapter.rooms[room].sockets;

    io.to(room).emit('user count', {
      numbers: io.sockets.adapter.rooms[room].length
    });

    // socket.emit('events keys', s3);
  });

  // socket.on('get online users', function (room) {

  //   // socket.to(room).emit('user count', {
  //   //   numUsers: numClients[room]

  //   // });
  //   socket.broadcast.to(room).emit('user count', {
  //     numUsers: numClients[room]
  //   });
  // });

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
        numUsers: io.sockets.adapter.rooms[socket.room].length
      });

      console.log(socket.username + ' has disconnected from room ' + socket.room + '! ' + io.sockets.adapter.rooms[socket.room].length + " users online here now");

      io.to(socket.room).emit('user count', {
        numbers: io.sockets.adapter.rooms[socket.room].length
      });

      if (io.sockets.adapter.rooms[socket.room].length === 0) {
        arrayOfRooms.splice(arrayOfRooms.indexOf(socket.room, 1));
        console.log("That was the last user in that room so now its deleted", arrayOfRooms);
      }
    }
  });
});
