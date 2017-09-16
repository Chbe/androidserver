var allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', request.get('origin'));
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Origin', 'https://androidserverapp.herokuapp.com/*');
  res.header('Access-Control-Allow-Origin', 'https://androidserverapp.herokuapp.com/*/*');
  res.header('Access-Control-Allow-Origin', 'http://pinechat.azurewebsites.net');
  // res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
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

var cors = require('cors');
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




app.use(cors());
app.use(express.static(__dirname + '/public'));
app.use(allowCrossDomain);

var request = require('request');


server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

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

  socket.on('new message to bot', function (data) {
    botAI(data);
  });

  function botAI(data) {
    var apiai = require('apiai');
    var appai = apiai("22183c0b83c340f1ae96c2eebf3f8160");

    if(data.message.includes('@pineanas')) {
      data.message = data.message.toLowerCase().replace(/@pineanas/g, "");
    }

    var requestAi = appai.textRequest(data.message, {
      sessionId: data.room
    });

    requestAi.on('response', function (response) {
      var respmsg = "@" + data.username + " " + response.result.fulfillment.speech;
      var respUsername = "Pineanas"
      io.in(data.room).emit('new from bot', {
        username: respUsername,
        message: respmsg,
        timestamp: Date.now()
      });
    });

    requestAi.on('error', function (error) {
      console.log(error);
      socket.broadcast.to(data.room).emit('new from bot', {
        username: 'PineAnas',
        message: 'Im sleeping, try later',
        longitude: null,
        latitude: null,
        image: null,
        timestamp: Date.now()
      });
    });

    requestAi.end();
  }

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
    var numberOfUsers = io.sockets.adapter.rooms[room].length;
    console.log(socket.username + " has Connected to room " + room + "! " + numberOfUsers + " users online here now");

    socket.emit('new from bot', {
      username: 'Pineanas',
      message: 'Welcome to PineChat @' + username + '! If you want to talk to me, tag me in your message with "@pineanas"',
      timestamp: Date.now()
    });

    if(numberOfUsers === 1 ) {
      io.in(socket.room).emit('new from bot', {
        username: 'Pineanas',
        message: 'Hi there @' + username + ', looks like we are alone here. Good thing is that u dont have to type "@pineanas" to talk to me now, since its only u and me here..',
        timestamp: Date.now()
      });
    }



    // var c = io.sockets.adapter.rooms[room].sockets;

    io.to(room).emit('user count', {
      numbers: numberOfUsers
    });

    // socket.emit('events keys', s3);
  });

  socket.on('total count', function () {
    socket.emit('total counts', {
      count: numUsers,
      cities: arrayOfRooms.length
    });
  });

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

      var usersInRoom = io.sockets.adapter.rooms[socket.room].length;
      socket.broadcast.to(socket.room).emit('user count', {
        numUsers: usersInRoom
      });

      console.log(socket.username + ' has disconnected from room ' + socket.room + '! ' + usersInRoom + " users online here now");

      io.to(socket.room).emit('user count', {
        numbers: usersInRoom
      });

      if(usersInRoom === 1 ) {
        io.in(socket.room).emit('new from bot', {
          username: 'Pineanas',
          message: 'Looks like we are alone now',
          timestamp: Date.now()
        });
      }

      if (usersInRoom === 0) {
        arrayOfRooms.splice(arrayOfRooms.indexOf(socket.room, 1));
        console.log("That was the last user in that room so now its deleted", arrayOfRooms);
      }
    }
  });
});
