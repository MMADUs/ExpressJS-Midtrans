const express = require('express');
const router = express.Router();

const {
    sendEmail,
    addFeedback,
    getFeedback,
    feedbackStatistic
} = require('../controller/feedback-controller')

router.post('/send', sendEmail);
router.post('/add/:token', addFeedback);
router.get('/get', getFeedback);
router.get('/statistic', feedbackStatistic);

module.exports = router;