const Minio = require('minio');
const Product = require('../model/product-model');
const randomstring = require('randomstring');

const minioClient = new Minio.Client({
    endPoint: '127.0.0.1',
    port: 9000,
    useSSL: false,
    accessKey: 'admin',
    secretKey: 'password',
});

const addProduct = async (req, res) => {
    const file = req.file;
    const { nama, deskripsi, kategori, harga } = req.body;

    if (!file || !nama || !deskripsi || !kategori || !harga) {
        return res.status(400).send('Data belum sesuai!');
    }

    try {
        // Generate random number
        const randomNumbers = randomstring.generate({
            length: 5,
            charset: 'numeric',
        });
    
        // Upload the file to MinIO
        const gambar = `${randomNumbers}-${file.originalname}`;
        await minioClient.putObject(process.env.BUCKET, gambar, file.buffer);
    
        // Store data in the database
        await Product.create ({
            nama: nama,
            deskripsi: deskripsi,
            gambar: gambar,
            kategori: kategori,
            harga: harga,
            stock: 0
        });
    
        res.status(200).send('Data berhasil di input!');
    } catch (error) {
        console.log(error.message);
        return res.json({ message: error.message });
    }
};

const getProduct = async (req, res) => {
    try {
        if(req.query.search) {
            const search = req.query.search

            // Split the search query into individual words
            const searchWords = search.split(" ");

            // Construct an array of conditions for each word
            const conditions = searchWords.map(word => ({ nama: { $regex: new RegExp(word, "i") } }));

            // Perform the search for each word and combine the results
            const reqProduct = await Product.find({ $and: conditions });
            res.status(200).json(reqProduct)
        } else {
            const allProduct = await Product.find()
            res.status(200).json(allProduct)
        }
    } catch (error) {
        console.log(error.message)
        res.status(500).json({message: error.message})
    }
}

const getProductById = async (req, res) => {
    const id = req.params.id

    try {
        const ProductById = await Product.findById(id)
        if(!ProductById) {
            return res.status(404).json({ message: "Product not found" })
        }
        
        res.status(200).json(ProductById)
    } catch (error) {
        console.log(error.message)
        res.status(500).json({message: error.message})
    }
}

const deleteProduct = async (req, res) => {
    const id = req.params.id

    try {
        // Find the document by ID
        const ProductToDelete = await Product.findById(id);
    
        if (!ProductToDelete) {
            return res.status(404).send('Product not found');
        }
    
        // Delete images from MinIO
        const fileToDelete = ProductToDelete.gambar;
    
        await minioClient.removeObject(process.env.BUCKET, fileToDelete);
    
        // Delete the document from MongoDB
        await Product.findByIdAndDelete(id);
    
        res.send('Data berhasil di hapus!');
    } catch (error) {
        console.error('Error deleting data:', error);
        res.status(500).send('Internal Server Error');
    }
}

const updateProductById = async (req, res) => {
    const file = req.file;
    const { nama, deskripsi, kategori, harga } = req.body;
    const id = req.params.id;

    try {
        const productExist = await Product.findById(id);
        
        if (!productExist) {
            return res.status(404).json({ message: 'Produk tidak ditemukan!' });
        }

        let updatedGambar
        // If the file is provided, update the image in MinIO
        if (file) {
            const existingRandomNumbers = productExist.gambar.split('-')[0];
            updatedGambar = `${existingRandomNumbers}-${file.originalname}`;

            if (productExist.gambar) {
                await minioClient.removeObject(process.env.BUCKET, productExist.gambar);
            }

            await minioClient.putObject(process.env.BUCKET, updatedGambar, file.buffer);
        } else {
            updatedGambar = productExist.gambar
        }

        const existingTanggal = productExist.tanggal;
        const existingStock = productExist.stock;
        const existingStockUpdate = productExist.stock_update;

        const product_update = new Date().toLocaleString();

        // Update data in the database
        productExist.nama = nama;
        productExist.deskripsi = deskripsi;
        productExist.gambar = updatedGambar;
        productExist.kategori = kategori;
        productExist.harga = harga;

        // using previous data
        productExist.stock = existingStock;
        productExist.tanggal = existingTanggal
        productExist.product_update = product_update;
        productExist.stock_update = existingStockUpdate;

        await productExist.save();

        res.status(200).send('Data berhasil di update!');
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const UpdateProductStock = async (req, res) => {
    const { stock } = req.body
    const id = req.params.id
    console.log(req.body)

    try {
        const productExist = await Product.findById(id);

        if (!productExist) {
            return res.status(404).json({ message: 'Produk tidak ditemukan!' });
        }

        // Increment the stock by the specified amount
        productExist.stock = parseInt(productExist.stock) + parseInt(stock);
        productExist.stock_update = new Date()

        // Save the updated product
        await productExist.save();

        res.status(200).send('Stock berhasil di update!');
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).send('Internal Server Error');
    }
}

const getProductStock = async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search_query || "";
    const sortQuery = req.query.sort || "";
    const skip = limit * page;

    const query = {
        nama: { $regex: search, $options: 'i' }
    };

    const sortOptions = {}; // Object to hold sort options

    if (sortQuery === 'least') {
        sortOptions.stock = 1; // Sort by ascending stock (least to most)
    } else if (sortQuery === 'most') {
        sortOptions.stock = -1; // Sort by descending stock (most to least)
    } else {
        // No sort query, default sorting (by _id descending)
        sortOptions._id = -1;
    }

    try {
        const totalRows = await Product.countDocuments(query);
        const totalPage = Math.ceil(totalRows / limit);
        const result = await Product.find(query)
            .select('-deskripsi -harga -tanggal -product_update')
            .skip(skip)
            .limit(limit)
            .sort(sortOptions);

        res.json({
            result,
            page,
            limit,
            totalRows,
            totalPage
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal server error" });
    }
};

const getProductQuery = async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search_query || "";
    const category = req.query.category
    const skip = limit * page;

    const query = {
        nama: { $regex: search, $options: 'i' }
    };

    if (category) {
        query.kategori = { $regex: category, $options: 'i' };
    }

    try {
        const totalRows = await Product.countDocuments(query);
        const totalPage = Math.ceil(totalRows / limit);
        const result = await Product.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ _id: -1 });

        res.json({
            result,
            page,
            limit,
            totalRows,
            totalPage
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal server error" });
    }
};

const ProductStatistic = async (req, res) => {
    try {
        const ProductCount = await Product.countDocuments()
        const LeastStock = await Product.countDocuments({ stock: 0 })
        const AvailableStock = await Product.countDocuments({ stock: { $gt: 0 } })
        res.status(200).json({ ProductCount, LeastStock, AvailableStock })
    } catch (error) {
        console.log(error)
    }
}

exports.addProduct = addProduct
exports.getProduct = getProduct
exports.getProductById = getProductById
exports.deleteProduct = deleteProduct
exports.updateProductById = updateProductById
exports.UpdateProductStock = UpdateProductStock
exports.getProductStock = getProductStock
exports.getProductQuery = getProductQuery
exports.ProductStatistic = ProductStatistic