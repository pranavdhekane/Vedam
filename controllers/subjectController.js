const Subject = require('../models/Subject');

exports.createSubject = async (req, res) => {
  try {
    const count = await Subject.countDocuments({ userId: req.session.userId });
    if (count >= 3) return res.status(400).json({ error: 'Max 3 subjects' });
    
    const subject = await Subject.create({ name: req.body.name, userId: req.session.userId });
    res.status(201).json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.session.userId });
    res.json({ subjects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.uploadNotes = async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.subjectId, userId: req.session.userId });
    if (!subject) return res.status(404).json({ error: 'Not found' });
    
    const notes = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      path: f.path
    }));
    
    subject.notes.push(...notes);
    await subject.save();
    res.json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    await Subject.findOneAndDelete({ _id: req.params.subjectId, userId: req.session.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
