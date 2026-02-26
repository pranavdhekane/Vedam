const Subject = require('../models/Subject');
const DocumentChunk = require('../models/DocumentChunk');
const { answerQuestion } = require('../services/ragService');

exports.sendMessage = async (req, res) => {
  try {
    const { chatId, message } = req.body;
    const userId = req.session.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const subject = await Subject.findOne({ 
      _id: chatId, 
      userId 
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const chunkCount = await DocumentChunk.countDocuments({
      subjectId: chatId,
      userId
    });

    if (chunkCount === 0) {
      return res.json({ 
        message: 'Please upload notes before asking questions. No documents found for this subject.'
      });
    }

    const result = await answerQuestion(
      chatId,
      userId,
      message,
      subject.name
    );

    const formattedMessage = formatResponse(result);

    res.json({
      message: formattedMessage
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.json({ 
      message: 'Error: ' + error.message
    });
  }
};

function formatResponse(result) {
  let response = result.answer;

  if (result.confidence) {
    response += `\n\nConfidence: ${result.confidence}`;
  }

  if (result.citations && result.citations.length > 0) {
    response += '\n\nSources:';
    result.citations.forEach((citation, idx) => {
      response += `\n${idx + 1}. ${citation.filename} (Section ${citation.chunkIndex})`;
    });
  }

  if (result.evidence && result.evidence.length > 0) {
    response += '\n\nEvidence:';
    result.evidence.forEach((ev, idx) => {
      response += `\n\n[${idx + 1}] ${ev.source}:\n"${ev.text}"`;
    });
  }

  return response;
}

module.exports = exports;
