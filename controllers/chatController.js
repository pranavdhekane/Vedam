const Chat = require('../models/Chat');

exports.createChat = async (req, res) => {
  try {
    const chat = await Chat.create({ userId: req.session.userId, subjectId: req.body.subjectId, messages: [] });
    res.json({ success: true, chatId: chat._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.session.userId });
    if (!chat) return res.status(404).json({ error: 'Not found' });
    res.json({ messages: chat.messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.body.chatId, userId: req.session.userId });
    if (!chat) return res.status(404).json({ error: 'Not found' });
    
    chat.messages.push({ role: 'user', content: req.body.message });
    chat.messages.push({ role: 'assistant', content: 'RAG response here', confidence: 'Medium' });
    await chat.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
