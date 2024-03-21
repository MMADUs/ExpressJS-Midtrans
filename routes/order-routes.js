const express = require('express');
const router = express.Router();
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
    addOrder,
    getOrder,
    getOrderById,
    deleteOrder,
    OrderStatus,
    createTransaction,
    PaymentStatusById,
    Notification,
    TransactionById,
    HistoryStatistic,
    OrderStatistic,
    GenerateReport,
    EmailPDF
} = require('../controller/order-controller')

router.post('/add', addOrder);
router.get('/get', getOrder);
router.get('/detail/:id', getOrderById);
router.delete('/delete/:id', deleteOrder);
router.put('/status/:id', OrderStatus);
router.post('/transaction', createTransaction);
router.get('/status/:id', PaymentStatusById);
router.post('/notification', Notification);
router.get('/transaction/detail/:id', TransactionById);
router.get('/history/statistic', HistoryStatistic);
router.get('/order/statistic', OrderStatistic)
router.post('/report', GenerateReport)
router.post('/pdf', upload.single('file'), EmailPDF);

module.exports = router;