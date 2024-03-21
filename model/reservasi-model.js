const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReservasiSchema = new mongoose.Schema({
    nama: {
        type: String,
        required: true,
    },
    no_meja: {
        type: String,
        required: true,
    },
    jadwal: {
        type: Date,
        required: true,
    },
    kode_reservasi: {
        type: Number,
        required: true,
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    }
}, {
    timestamps: true
});

const Reservasi = mongoose.model('Reservasi', ReservasiSchema)

module.exports = Reservasi;