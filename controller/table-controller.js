const Table = require('../model/table-model')

const addTable = async (req, res) => {
    const { no_meja, letak } = req.body

    if(!no_meja || !letak) {
        return res.status(400).json({ message: "Data tidak lengkap!" })
    }

    try {
        const tableExist = await Table.findOne({ no_meja });

        if(tableExist) {
            return res.status(400).json({ message: "Table number exist!" })
        }

        await Table.create ({
            no_meja: no_meja,
            letak: letak
        })

        res.status(200).json({ message: "new table added!"})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({message: error.message})
    }
}

const getTableQuery = async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    let query = {};

    // Check if search query is provided
    if (req.query.search_query) {
        const search = parseInt(req.query.search_query);
        if (!isNaN(search)) {
            query.no_meja = search;
        } else {
            return res.status(400).json({ error: "Invalid search_query. Must be a number." });
        }
    }

    try {
        const totalRows = await Table.countDocuments(query);
        const totalPage = Math.ceil(totalRows / limit);
        const skip = limit * page;  

        const result = await Table.find(query)
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
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const getTable = async (req, res) => {
    try {
        const allTable = await Table.find()
        res.status(200).json({ allTable })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const getTableById = async (req, res) => {
    const id = req.params.id

    try {
        const TableById = await Table.findById(id)

        if(!TableById) {
            return res.status(404).json({ message: "no data found" })
        }

        res.status(200).json(TableById)
    } catch (error) {
        console.log(error.message)
        res.status(500).json({message: error.message})
    }
}

const deleteTable = async (req, res) => {
    const id = req.params.id

    try {
        const TableToDelete = await Table.findById(id)

        if(!TableToDelete) {
            return res.status(404).json({ message: "Table not found" })
        }

        await Table.findByIdAndDelete(id)
        res.status(200).json({ message: "Table Successfully deleted" })     
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}

const updateTable = async (req, res) => {
    const id = req.params.id
    const { no_meja, letak } = req.body
    console.log(req.body)
    console.log(id)

    const TableExist = await Table.findOne({ no_meja });

    if(TableExist) {
        return res.status(400).json({ message: "Nomor meja sudah ada!" })
    }

    try {
        const TableExist = await Table.findById(id);

        if (!TableExist) {
            return res.status(404).json({ message: 'Produk tidak ditemukan!' });
        }

        const existingStatus = TableExist.status

        TableExist.no_meja = no_meja
        TableExist.letak = letak
        TableExist.status = existingStatus

        await TableExist.save()
        
        res.status(200).send('Data meja berhasil di update!');
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}

const reservasiTable = async (req, res) => {
    const { status } = req.body
    const id = req.params.id

    try {
        const tableExist = await Table.findById(id);

        if (!productExist) {
            return res.status(404).json({ message: 'Meja tidak ditemukan!' });
        }

        tabletExist.status = status;

        // Save the updated product
        await tableExist.save();

        res.status(200).send('Status berhasil di update!');
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}

const TableStatistic = async (req, res) => {
    try {
        const TableCount = await Table.countDocuments()
        res.status(200).json({ TableCount })
    } catch (error) {
        console.log(error)
    }
}

exports.addTable = addTable
exports. getTableQuery = getTableQuery
exports.getTable = getTable
exports. getTableById = getTableById
exports. deleteTable = deleteTable   
exports.updateTable = updateTable
exports.reservasiTable = reservasiTable
exports.TableStatistic = TableStatistic