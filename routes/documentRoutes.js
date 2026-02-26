const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { isAuthenticated } = require('../middleware/auth');
const upload = require('../config/multer');

router.post('/upload/:subjectId', isAuthenticated, upload.array('documents', 10), documentController.uploadDocuments);
router.get('/list/:subjectId', isAuthenticated, documentController.getDocuments);

module.exports = router;
