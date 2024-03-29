const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const multer = require('multer')

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use('/uploads', express.static('uploads'));

var users = [];
var rooms = [];

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: function(req, file, cb) {
    cb(null,  Date.now()+file.originalname)
  }
})

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') { //file.mimetype === 'application/pdf'
      cb(null, true)
    } else {
      cb(null, false)
    //   return cb(new Error('Only .png, .jpg, .mp4 and .jpeg format allowed!'))
    }
}

const upload = multer({
  storage: storage, 
  // fileFilter,
  // limits: {
  //     fileSize: 1024*1024*5
  // }
})

app.post('/sendimage', upload.single('image'), (req, res) => {
  console.log(req.body.room)
  for (const room of rooms) {
    if (req.body.room === room.name) {
        room.images.push(req.file.path)
    }
  }
  res.send({'data': {'url': req.file.path}});
});

app.get('/chat/history/:room/:lastStartPosition?/:page?', (req, res) => {
  var limit = 20
  var room = rooms.find(room => room.name === req.params['room'])
  var startAt = req.params['lastStartPosition'] ? req.params['lastStartPosition'] : 0
  var endPosition = 0
  var page = req.params['page'] ? req.params['page'] : 1
  var isEnded = false
  if (room != null) {
    if (startAt == 0 && page == 1) {
      if (room.messages.length < limit) {
        isEnded = true
        endPosition = room.messages.length
      } else {
        startAt = room.messages.length - limit
        endPosition = startAt + limit
        if (startAt == 0) {
          isEnded = true
        }
      }
    } else {
      temp = startAt - limit
      if (temp < 0) {
        isEnded = true
        endPosition = startAt
        startAt = 0
      } else {
        startAt = temp
        endPosition = startAt + limit
        if (startAt == 0) {
          isEnded = true
        }
      }
    }
    page++;
    res.send({'data': room.messages.slice(startAt, endPosition),
    'nextUrl': (isEnded) ? '' : 'chat/history/'+req.params['room']+'/'+startAt+'/'+page});
  } else {
    res.status(400).send();
  }
});

app.get('/room', (req, res) => {
  res.send({'data': rooms})
});

app.post('/newroom', (req, res) => {
  const repeated = rooms.find(room => room.name === req.body.name)

  if (repeated == null) {
    rooms.push({
      name: req.body.name,
      activeUser: 0,
      images: [],
      messages: []
    })
    
    console.log(rooms)

    res.send({})
  }else {
    console.log(repeated)

    res.status(400).send();
  }
});

app.post('/checkroom', (req, res) => {
  const check = rooms.find(room => room.name === req.body.name)

  if (check != null) {
    res.send({'data': req.body.name});
  }else {
    res.status(400).send();
  }
})

io.on('connection', (socket) => {
  socket.on('EVENT_JOINED_LOBBY', (username) => {
    console.log("Connect ", username, " ", socket.id);

    socket.emit('EVENT_JOINED_LOBBY', {
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
    if (user == null) return
    if (user.room != "") {
      rooms = rooms.map(obj => {
        if (user.room === obj.name) {
          return {...obj, activeUser: obj.activeUser - 1};
        }
        return obj;
      });
      const check = rooms.find((check) => check.name === user.room)
      if (check != null && check.activeUser == 0) {
        const removed = rooms.pop((removed) => removed.name === users)
        var fs = require('fs');
        for (const image of check.images) {
          fs.unlinkSync(image) 
        }
        console.log(removed, "removed")
      } else {
        socket.to(user.room).emit('EVENT_UPDATE_USER_STATE', {
          username: user.username,
          state: 'state_left'
        });
      }
    }
    console.log("Disconnect ", user);
    console.log(users);
  });

  socket.on('EVENT_UPDATE_USER_STATE', (info) => {
    const data = JSON.parse(info)
    console.log(data)

    rooms = rooms.map(obj => {
      if (data.room === obj.name) {
        return {...obj, activeUser: obj.activeUser + 1};
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

    socket.to(data.room).emit('EVENT_UPDATE_USER_STATE', {
      username: data.username,
      state: 'state_joined'
    });
  });

  socket.on('EVENT_LEFT_ROOM', async (username) => {
    var room = ''

    for (const user of users) {
      if (user.id === socket.id) {
        room = user.room
        console.log(username,' left ', room)
        user.room = '';
    
        rooms = rooms.map(obj => {
          if (room === obj.name) {
            return {...obj, activeUser: obj.activeUser - 1};
          }
        
          return obj;
        });

        const check = rooms.find((check) => check.name === room)

        if (check != null && check.activeUser == 0) {
          const removed = rooms.pop((removed) => removed.name === room)
          var fs = require('fs');
          for (const image of check.images) {
            fs.unlinkSync(image) 
          }
          console.log(removed, "removed")
        } else {
          socket.to(room).emit('EVENT_UPDATE_USER_STATE', {
            username: username,
            state: 'state_left'
          });
        }

        break;
      }
    }
    socket.leave(room)
    socket.emit('EVENT_LEFT_ROOM');
  });

  socket.on('EVENT_SEND_MESSAGE',(msg) => {
    const data = JSON.parse(msg)
    data.status = 'completed'
    socket.emit('EVENT_SEND_SUCCESSFULLY', data);
    data.type = 'type_message_receive'
    socket.to(data.room).emit('EVENT_NEW_MESSAGE', data);
    for (const room of rooms) {
      if (data.room === room.name) {
          room.messages.push(data)
      }
    }
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});