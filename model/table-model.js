const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
    no_meja: {
        type: Number,
        required: true,
    },
    letak: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

const Table = mongoose.model('Table', TableSchema)

module.exports = Table;