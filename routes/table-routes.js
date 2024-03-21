const express = require('express');
const router = express.Router();

const {
    addTable,
    getTableQuery,
    getTable,
    getTableById,
    deleteTable,
    updateTable,
    reservasiTable,
    TableStatistic
} = require('../controller/table-controller')

router.post('/add', addTable);
router.get('/get', getTableQuery);
router.get('/all', getTable)
router.get('/detail/:id', getTableById);
router.delete('/delete/:id', deleteTable);
router.patch('/update/:id', updateTable);
router.patch('/reservasi/:id', reservasiTable);
router.get('/statistic', TableStatistic)

module.exports = router;