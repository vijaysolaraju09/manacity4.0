const express = require('express');
const {
  listActiveAnnouncements,
  getAnnouncementById,
} = require('../controllers/announcementController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', listActiveAnnouncements);
router.get('/:id', getAnnouncementById);

module.exports = router;
