const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { getHistory, getHistoryItem } = require('../controllers/historyController');

router.get('/', protect, getHistory);
router.get('/:type/:referenceId', protect, getHistoryItem);

module.exports = router;
