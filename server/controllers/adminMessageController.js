const AdminMessage = require('../models/AdminMessage');

exports.getAdminMessages = async (req, res) => {
  try {
    const messages = await AdminMessage.find().sort({ createdAt: -1 }).lean();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin messages' });
  }
};
