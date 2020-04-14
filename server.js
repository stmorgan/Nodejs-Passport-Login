if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const sqlite3 = require('sqlite3').verbose()

function store_registration(name, email, hash) {
  console.log('in store_registration')
  let db = open_db()
  write_registration(db, name, email, hash)
  close_db(db)
}

function open_db() {
  let db = new sqlite3.Database('users.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the database.');
  });
  return db
}

function write_registration(db, name, email, hash) {
  console.log("in write_registration")
    db.run(`INSERT into users(name, email, hashedpassword) VALUES (?, ?, ?)`, [name, email, hash], function(err) {
      if (err) {
        return console.log(err.message);
      }
      // get the last insert id
      // console.log(`A row has been inserted with rowid ${this.lastID}`);
    });
}

function close_db(db) {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Close the database connection.');
  });
}

const initializePassport = require('./passport-config')

function getUserByEmail(email) {
  let db = open_db()
  db.serialize(() => {
    db.each(`SELECT name, email, hashedpassword FROM user WHERE email=` + email, (err, row) => {
      if (err) {
        console.error(err.message);
      }
      console.log(row.id + "\t" + row.name);
    });
  });
  close_db(db)
}

function getUserByID(id) {
  let db = open_db()
  db.serialize(() => {
    db.each(`SELECT name, email, hashedpassword FROM user WHERE rowid=` + id, (err, row) => {
      if (err) {
        console.error(err.message);
      }
      console.log(row.id + "\t" + row.name);
    });
  });
  close_db(db)
}

// initializePassport(
//   passport,
//   email => users.find(user => user.email === email),
//   id => users.find(user => user.id === id)
// )

initializePassport(passport, getUserByEmail, getUserByID)

// const users = []

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(express.static(__dirname))
app.use(flash()) // For showing error messages.
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs', { name: req.user.name })
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    // users.push({
    //   id: Date.now().toString(),
    //   name: req.body.name,
    //   email: req.body.email,
    //   password: hashedPassword
    // })
    console.log('before store_registration')
    store_registration(req.body.name, req.body.email, hashedPassword)
    console.log(hashedPassword)
    res.redirect('/login')
  } catch {
    console.log("Caught error in Registration post")
    res.redirect('/register')
  }
})

app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

app.listen(3000)