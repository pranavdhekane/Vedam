require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Subject = require('./models/Subject');
const DocumentChunk = require('./models/DocumentChunk');
const upload = require('./config/multer');
const documentController = require('./controllers/documentController');
const chatController = require('./controllers/chatController');

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

app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session && req.session.userId ? true : false;
  next();
});

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) return next();
  res.redirect('/login');
};

const isGuest = (req, res, next) => {
  if (req.session && req.session.userId) return res.redirect('/dashboard');
  next();
};

app.get('/', (req, res) => res.redirect('/login'));
app.get('/register', isGuest, (req, res) => res.render('auth'));
app.get('/login', isGuest, (req, res) => res.render('auth'));

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const exists = await User.findOne({ email: username });
    if (exists) return res.status(400).json({ message: 'User already exists' });
    const user = await User.create({ name: username, email: username, password });
    req.session.userId = user._id;
    res.json({ message: 'Registration successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ email: username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    req.session.userId = user._id;
    res.json({ message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.session.userId });
    res.render('dashboard', { subjects });
  } catch (error) {
    res.status(500).send('Error loading dashboard');
  }
});

app.post('/api/subjects/create', isAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Subject name required' });
    
    const subjectCount = await Subject.countDocuments({ userId: req.session.userId });
    if (subjectCount >= 3) {
      return res.status(400).json({ message: 'Maximum 3 subjects allowed' });
    }
    
    const subject = await Subject.create({ name, userId: req.session.userId });
    res.json({ message: 'Subject created', subject });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/subjects/list', isAuthenticated, async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.session.userId });
    res.json({ subjects });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/subjects/:id', isAuthenticated, async (req, res) => {
  try {
    const subject = await Subject.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    subject.notes.forEach(note => {
      const filePath = path.join(__dirname, note.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
    await DocumentChunk.deleteMany({
      subjectId: req.params.id,
      userId: req.session.userId
    });
    
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/chat/:subjectId', isAuthenticated, async (req, res) => {
  try {
    const subject = await Subject.findOne({ 
      _id: req.params.subjectId, 
      userId: req.session.userId 
    });
    if (!subject) return res.status(404).send('Subject not found');
    res.render('chat', { subject, subjectId: req.params.subjectId });
  } catch (error) {
    res.status(500).send('Error loading chat');
  }
});

app.post('/documents/upload/:subjectId', 
  isAuthenticated, 
  upload.array('documents', 10), 
  documentController.uploadDocuments
);

app.get('/documents/list/:subjectId', 
  isAuthenticated, 
  documentController.getDocuments
);

app.delete('/documents/delete/:subjectId/:filename', 
  isAuthenticated, 
  documentController.deleteDocument
);

app.post('/api/chat/message', 
  isAuthenticated, 
  chatController.sendMessage
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
