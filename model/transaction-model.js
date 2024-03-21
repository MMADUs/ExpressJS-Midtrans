const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new mongoose.Schema({
    order_id: {
        type: Schema.Types.ObjectId,
        ref: 'Orders',
        required: true
    },
    transaksi_id: {
        type: String,
        default: null
    },
    tipe_pembayaran: {
        type: String,
        default: null
    },
    status_pembayaran: {
        type: String,
        default: null
    },
    total: {
        type: Number,
        required: true
    },
    waktu_pembayaran: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const Transaction = mongoose.model('Transaction_Notification', TransactionSchema);

module.exports = Transaction;
