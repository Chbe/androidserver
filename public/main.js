$(function() {

  var socket = io();

 
 
  socket.on('total counts', function(data) {
    $('#myId').text(data.count + ' people online in ' + data.cities + ' cities');
  });
});