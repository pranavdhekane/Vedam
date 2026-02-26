const User = require('../models/User');

exports.showRegister = (req, res) => res.render('auth');
exports.showLogin = (req, res) => res.render('auth');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email exists' });
    
    const user = await User.create({ name, email, password });
    req.session.userId = user._id;
    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.session.userId = user._id;
    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
};