$(function() {

  var socket = io();

 socket.emit('request total count');
 
  socket.on('total counts', function(data) {
    $('#myId').text(data.count + ' people online in ' + data.cities + ' cities');
  });
});