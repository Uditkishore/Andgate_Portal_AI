const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

router.post('/create', feedbackController.createFeedback);
router.get('/check_event/:eventId', feedbackController.isFeedbackExists);
router.get('/get_feedback/:eventId', feedbackController.getFeedbackByEventId);

module.exports = router;
