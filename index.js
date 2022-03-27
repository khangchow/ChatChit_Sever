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
  const repeated = rooms.find(room => room.name === req.body.name)

  if (repeated == null) {
    rooms.push({
      name: req.body.name,
      active: 0
    })
    
    console.log(rooms)

    res.send({'data': 'Created new room', 'error': ''})
  }else {
    console.log(repeated)

    res.send({'data': '', 'error': 'Repeated room name'});
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
    const user = users.pop((user) => user.id === socket.id)

    console.log("Disconnect ", user);
    console.log(users);
  });

  socket.on('newUserJoinedRoom', (info) => {
    const data = JSON.parse(info)
    console.log(data)

    rooms = rooms.map(obj => {
      if (data.room === obj.name) {
        return {...obj, active: obj.active + 1};
      }
    
      return obj;
    });

    console.log(rooms)

    for (const user of users) {
      if (user.id === socket.id) {
        user.room = data.room;
    
        break;
      }
    }

    socket.join(data.room)

    socket.to(data.room).emit('userState', {
      username: data.username,
      state: 'joined'
    });
  });

  socket.on('leftRoom', (username) => {
    var room = ''

    for (const user of users) {
      if (user.id === socket.id) {
        room = user.room
        console.log(username,' left ', room)
        user.room = '';
    
        rooms = rooms.map(obj => {
          if (room === obj.name) {
            return {...obj, active: obj.active - 1};
          }
        
          return obj;
        });

        const check = rooms.find((check) => check.name === room)
        console.log(check)

        if (check.active === 0) {
          const removed = rooms.pop((removed) => removed.name === room)

          console.log(removed, "removed")
        }

        break;
      }
    }

    socket.leave(room)

    socket.to(room).emit('userState', {
      username: username,
      state: 'left'
    });

    socket.emit('leftRoom', 'You are now in lobby');
  });

  socket.on('sendMessage',(msg) => {
    const user = users.find((user) => user.id === socket.id)
    const data = JSON.parse(msg)

    io.in(user.room).emit('newMessage', msg);
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});