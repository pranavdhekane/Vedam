require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 604800000, httpOnly: true }
}));

app.use('/', require('./routes/pageRoutes'));
app.use('/', require('./routes/authRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

app.get("/chat", (req, res) => {
    res.render("chat", {
        title: "Chat",
        username: req.session?.user?.username || "User"
    });
});


app.listen(process.env.PORT || 3000, () => console.log('Server running'));
