const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

var users = [];
var rooms = [];

app.get('/room', (req, res) => {
  res.send({'data': rooms, 'error': ''});
});

app.get('/newroom', (req, res) => {
  var repeated = rooms.find(room => room.name === req.name)

  if (repeated == null) {
    rooms.push({
      name: req.name,
      active: 1
    })
    
    res.send({'data': 'Created New Room', 'error': ''})
  }
  
  res.send({'data': '', 'error': 'Repeated Room Name'});
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    var user = users.pop((user) => user.id === socket.id)

    console.log("Disconnect ", user);
    console.log(users);

    socket.broadcast.emit('userState', {
        username: user.username,
        state: 'left'
    });
  });

  socket.on('newUser', (username) => {
    console.log("Connect ", username);

    users.push({
      id: socket.id,
      username: username
    });

    console.log(users);

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