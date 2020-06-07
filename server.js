const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
var sslRedirect = require('heroku-ssl-redirect');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var userCounter=0;
var roomno = 1;

io.on('connection', function(socket){
  userCounter++
  
  socket.on('disconnect', function(){
    userCounter--
  });

  socket.on('quitRoom',(roomno)=>{
    socket.leave("room-"+roomno);
    socket.to("room-"+roomno).emit('quitRoom',null)
  })

  socket.on('joinRoom', function(specifiedRoomNo){
    var room = io.nsps['/'].adapter.rooms["room-"+roomno];
    let clientCount=0
    if(room)// if room exist
      clientCount=room.length
    if(room && clientCount > 1) // if room is full
      roomno++;
    joiningRoom=specifiedRoomNo||roomno //if user specified a room number to join else assign a number
    socket.join("room-"+joiningRoom);
    //console.log('Joining room'+joiningRoom)
    //Send this event to everyone in the room to update room status and room number.
    io.sockets.in("room-"+joiningRoom).emit('connectToRoom',{roomno:joiningRoom,clientCount:clientCount});
  });

  socket.on('emitUsername',(data)=>{// to be integrated in setplayingcolor
    socket.to("room-"+data.roomno).emit('emitUsername',data.username);// tell opponent your name
  })

  socket.on('move', function(move){//move is a JSON with x,y coord and isBlack boolean
    //console.log('Move : x:'+move.x+' y:'+move.y+' isBlack: '+move.isBlack);
    socket.to("room-"+move.roomno).emit('move',move);// emit move to the room
  });

  socket.on('setPlayingColor',(data)=>{
    //console.log('User '+data.username+'Playing: '+data.isBlack);
    socket.to("room-"+data.roomno).emit('setPlayingColor',data);// emit move to the room
  })

  socket.on('roomChat',(data)=>{
    //console.log('User '+data.username+'Playing: '+data.isBlack);
    socket.to("room-"+data.roomno).emit('roomChat',data.message);// emit move to the room
  })

});

const port = process.env.PORT || 5000;
app.use(sslRedirect());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

http.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
