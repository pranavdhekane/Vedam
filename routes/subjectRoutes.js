const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { isAuthenticated } = require('../middleware/auth');
const upload = require('../config/multer');

router.post('/create', isAuthenticated, subjectController.createSubject);
router.get('/list', isAuthenticated, subjectController.getSubjects);
router.post('/:subjectId/upload', isAuthenticated, upload.array('notes', 10), subjectController.uploadNotes);
router.delete('/:subjectId', isAuthenticated, subjectController.deleteSubject);

module.exports = router;
