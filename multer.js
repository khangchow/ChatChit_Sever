const multer = require('multer')

// function makeid (length) {
//   var result = ''
//   var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
//   var charactersLength = characters.length
//   for (var i = 0; i < length; i++) {
//     result += characters.charAt(Math.floor(Math.random() * charactersLength))
//   }
//   return result
// }

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, './uploads/')
    },
    filename: function(req, file, cb) {
      // const fileName = file.originalname.toLowerCase().split(' ').join('-')
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

module.exports.send = (req, res, next) => {
  return upload.single('image')(req, res, () => {
    // Remember, the middleware will call it's next function
    // so we can inject our controller manually as the next()
    req.oldAvatar = req.user.avatar
    
    next()
  })
}

