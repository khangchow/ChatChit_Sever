const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('a user connected ', socket.id);

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('newUser', (username) => {
    console.log(username);

    socket.emit('self', {
      id: socket.id,
      username: username
    });

    socket.broadcast.emit('newUser', {
      id: socket.id,
      username: username
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