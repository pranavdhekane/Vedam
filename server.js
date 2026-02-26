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
const upload = require('./config/multer');

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

// Middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) return next();
  res.redirect('/login');
};

const isGuest = (req, res, next) => {
  if (req.session && req.session.userId) return res.redirect('/dashboard');
  next();
};

// Routes
app.get('/', (req, res) => res.redirect('/login'));
app.get('/register', isGuest, (req, res) => res.render('auth'));
app.get('/login', isGuest, (req, res) => res.render('auth'));

// Auth routes
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
  res.redirect('/login');
});

// Dashboard and subjects
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
    const subject = await Subject.findOne({ _id: req.params.id, userId: req.session.userId });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    
    // Delete all files associated with the subject
    subject.notes.forEach(note => {
      const filePath = path.join(__dirname, note.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Chat routes
app.get('/chat/:subjectId', isAuthenticated, async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.subjectId, userId: req.session.userId });
    if (!subject) return res.status(404).send('Subject not found');
    res.render('chat', { subject, subjectId: req.params.subjectId });
  } catch (error) {
    res.status(500).send('Error loading chat');
  }
});

// Document routes
app.post('/documents/upload/:subjectId', isAuthenticated, upload.array('documents', 10), async (req, res) => {
  try {
    const { subjectId } = req.params;
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ message: 'No files uploaded' });
    
    const subject = await Subject.findOne({ _id: subjectId, userId: req.session.userId });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    
    const newFiles = files.map(file => ({ 
      filename: file.filename, 
      originalName: file.originalname, 
      path: file.path 
    }));
    subject.notes.push(...newFiles);
    await subject.save();
    
    res.json({ message: 'Files uploaded', files: subject.notes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/documents/list/:subjectId', isAuthenticated, async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.subjectId, userId: req.session.userId });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    const files = subject.notes.map(note => ({ 
      name: note.originalName,
      filename: note.filename,
      uploadedAt: note.uploadedAt 
    }));
    res.json({ files });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/documents/delete/:subjectId/:filename', isAuthenticated, async (req, res) => {
  try {
    const { subjectId, filename } = req.params;
    
    const subject = await Subject.findOne({ _id: subjectId, userId: req.session.userId });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    
    // Find the document
    const docIndex = subject.notes.findIndex(note => note.filename === filename || note.originalName === filename);
    if (docIndex === -1) return res.status(404).json({ message: 'Document not found' });
    
    const doc = subject.notes[docIndex];
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, doc.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Remove from database
    subject.notes.splice(docIndex, 1);
    await subject.save();
    
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Placeholder for chat message endpoint
app.post('/api/chat/message', isAuthenticated, async (req, res) => {
  try {
    // TODO: Implement actual chat functionality with AI
    res.json({ message: 'This is a placeholder response. Chat functionality will be implemented soon.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
