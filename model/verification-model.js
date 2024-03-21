const mongoose = require('mongoose');

const VerificationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    }
});

const Verification = mongoose.model('Verification', VerificationSchema)

module.exports = Verification;