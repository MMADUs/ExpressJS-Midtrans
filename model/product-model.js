const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    nama: {
        type: String,
        required: true,
    },
    deskripsi: {
        type: String,
        required: true,
    },
    gambar: {
        type: String,
        required: true,
    },
    kategori: {
        type: String,
        required: true,
    },
    harga: {
        type: String,
        required: true,
    },
    stock: {
        type: Number,
        required: true,
    },
    stock_update: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const Product = mongoose.model('Product', ProductSchema)

module.exports = Product;