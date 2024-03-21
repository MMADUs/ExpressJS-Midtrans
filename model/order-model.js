const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchema = new mongoose.Schema({
    nama_pemesan: {
        type: String,
        required: true,
    },
    no_meja: {
        type: String,
        required: true,
    },
    pesanan: {
        type: [{
            _id: {
                type: Schema.Types.ObjectId,
                default: new mongoose.Types.ObjectId()
            },
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'Products',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }],
    },
    status_pesanan: {
        type: String,
        required: true,
        default: "unpaid"
    },
    id_penerima: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
        default: null
    }
}, {
    timestamps: true
}, { 
    versionKey: false 
});

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;
