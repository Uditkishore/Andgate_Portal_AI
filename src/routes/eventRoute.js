const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/create_event', authMiddleware, eventController.createEvent);
router.post('/get_events/:candidateId', authMiddleware, eventController.getEventsByCandidateId);
router.patch('/event/update_status/:eventId', eventController.updateFeedbackStatus);

module.exports = router;
