const mongoose = require('mongoose');

const redeemCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rewardId: {
        type: String,
        required: true
    },
    pointsCost: {
        type: Number,
        required: true
    },
    issuedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isUsed: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('RedeemCode', redeemCodeSchema);
