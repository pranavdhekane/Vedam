const Subject = require('../models/Subject');

exports.uploadDocuments = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const subject = await Subject.findOne({ 
      _id: subjectId, 
      userId: req.session.userId 
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

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
};

exports.getDocuments = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const subject = await Subject.findOne({ 
      _id: subjectId, 
      userId: req.session.userId 
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const files = subject.notes.map(note => ({
      name: note.originalName,
      uploadedAt: note.uploadedAt
    }));

    res.json({ files });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
