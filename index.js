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

app.post('/newroom', (req, res) => {
  var repeated = rooms.find(room => room.name === req.body.name)

  if (repeated == null) {
    rooms.push({
      name: req.body.name,
      active: 1
    })
    
    console.log(rooms)

    res.send({'data': 'Created New Room', 'error': ''})
  }else {
    console.log(repeated)

    res.send({'data': '', 'error': 'Repeated Room Name'});
  }
});

io.on('connection', (socket) => {
  socket.on('newUser', (username) => {
    console.log("Connect ", username);

    socket.emit('self', {
      id: socket.id,
      username: username,
    });
  
    users.push({
      id: socket.id,
      username: username,
      room: ''
    })
  })

  socket.on('disconnect', () => {
    var user = users.pop((user) => user.id === socket.id)

    console.log("Disconnect ", user);
    console.log(users);

    socket.broadcast.emit('userState', {
        username: user.username,
        state: 'left'
    });
  });

  // socket.on('newUserJoinedRoom', ({username, room}) => {
  //   users.map((user) => {
  //     if (user.id === socket.id) return {...user, room: room};
  //     else return user;
  //   })

  //   socket.join(room)

  //   socket.broadcast.to(room).emit('userState', {
  //     username: username,
  //     state: 'joined'
  //   });
  // });

  // socket.on('chatMessage', (msg) => {
  //   console.log(msg);
  //   const user = users.find((user) => user.id === socket.id)
  
  //   io.to(user.room).emit('chatMessage', msg);
  // });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});