const express = require('express');
const router = express.Router();

const {
    addReservasi,
    getReservasi,
    deleteReservasi,
    ReservasiByCode,
    acceptReservasi,
    ReservasiByUser
} = require('../controller/reservasi-controller')

router.post('/add', addReservasi);
router.get('/get', getReservasi);
router.delete('/delete/:id', deleteReservasi);
router.post('/inquire', ReservasiByCode);
router.delete('/accept/:id', acceptReservasi);
router.post('/detail', ReservasiByUser)

module.exports = router;