const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Subject = require('../models/Subject');

router.get('/', (req, res) => res.redirect('/login'));

router.get('/dashboard', isAuthenticated, async (req, res) => {
  const subjects = await Subject.find({ userId: req.session.userId });
  res.render('dashboard', { subjects });
});

router.get('/chat/:subjectId', isAuthenticated, async (req, res) => {
  const subject = await Subject.findOne({ _id: req.params.subjectId, userId: req.session.userId });
  if (!subject) return res.status(404).send('Not found');
  res.render('chat', { subject });
});

router.get('/study-mode/:subjectId', isAuthenticated, async (req, res) => {
  const subject = await Subject.findOne({ _id: req.params.subjectId, userId: req.session.userId });
  if (!subject) return res.status(404).send('Not found');
  res.render('studyMode', { subject });
});

module.exports = router;
