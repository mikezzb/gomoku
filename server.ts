const path = require('path');
const express = require('express');
const cors = require('cors');
var sslRedirect = require('heroku-ssl-redirect');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var userCounter = 0;
var roomno = 1;

io.on('connection', function (socket) {
  userCounter++;

  socket.on('disconnect', function () {
    userCounter--;
  });

  socket.on('quitRoom', roomno => {
    socket.leave('room-' + roomno);
    socket.to('room-' + roomno).emit('quitRoom', null);
  });

  socket.on('joinRoom', function (specifiedRoomNo) {
    joiningRoom = specifiedRoomNo || roomno; //if user specified a room number to join else assign a number
    var room = io.nsps['/'].adapter.rooms['room-' + joiningRoom];
    let clientCount = 0;
    room && (clientCount = room.length);
    if (room && clientCount > 1 && joiningRoom === roomno) {
      // if room is full
      roomno++;
      joiningRoom++;
    }
    socket.join('room-' + joiningRoom);
    io.sockets
      .in('room-' + joiningRoom)
      .emit('connectToRoom', { roomno: joiningRoom, clientCount: clientCount });
  });

  socket.on('emitUsername', data => {
    socket.to('room-' + data.roomno).emit('emitUsername', data); // tell opponent your name
  });

  socket.on('move', function (move) {
    //move is a JSON with x,y coord and isBlack boolean
    socket.to('room-' + move.roomno).emit('move', move); // emit move to the room
  });

  socket.on('setPlayingColor', data => {
    io.to('room-' + data.roomno).emit('setPlayingColor', data); // emit move to the room
  });

  socket.on('roomChat', data => {
    socket
      .to('room-' + data.roomno)
      .emit('roomChat', { message: data.message, sendTime: data.sendTime }); // emit move to the room
  });

  socket.on('rematch', roomno => {
    io.to('room-' + roomno).emit('rematch', null); // emit move to the room
  });
});

const port = process.env.PORT || 5000;
app.use(sslRedirect());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

http.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
