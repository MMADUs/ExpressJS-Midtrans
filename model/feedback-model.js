const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FeedbackSchema = new mongoose.Schema({
    order_id: {
        type: Schema.Types.ObjectId,
        ref: 'Orders',
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    rate: {
        type: Number,
        required: true,
    },
    feedback: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

const Feedback = mongoose.model('Feedback', FeedbackSchema)

module.exports = Feedback;