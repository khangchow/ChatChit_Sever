const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

var users = [];

io.on('connection', (socket) => {
  console.log('a user connected ', socket.id);

  socket.on('disconnect', () => {
    console.log('user disconnected');
    socket.broadcast.emit('userState', {
        username: users.find((user) => user.id === socket.id).username,
        state: 'left'
    });
  });

  socket.on('newUser', (username) => {
    console.log(username);

    users.push({
      id: socket.id,
      username: username
    });

    socket.emit('self', {
      id: socket.id,
      username: username
    });

    socket.broadcast.emit('userState', {
      username: username,
      state: 'joined'
    });
  });

  socket.on('chatMessage', (msg) => {
    console.log(msg);
    io.emit('chatMessage', msg);
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});