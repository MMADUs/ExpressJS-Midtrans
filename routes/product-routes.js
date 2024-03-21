const express = require('express');
const multer = require('multer');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
    addProduct,
    getProduct,
    getProductById,
    deleteProduct,
    updateProductById,
    UpdateProductStock,
    getProductStock,
    getProductQuery,
    ProductStatistic
} = require('../controller/product-controller');

router.post('/add', upload.single('file'), addProduct);
router.get('/get', getProduct);
router.get('/detail/:id', getProductById);
router.delete('/delete/:id', deleteProduct);
router.put('/update/:id', upload.single('file'), updateProductById);
router.patch('/stock/:id', UpdateProductStock)
router.get('/stock', getProductStock)
router.get('/get/query', getProductQuery)
router.get('/statistic', ProductStatistic)

module.exports = router;