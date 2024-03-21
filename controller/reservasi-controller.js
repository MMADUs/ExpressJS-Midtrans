const randomstring = require('randomstring')
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken');

const Reservasi = require('../model/reservasi-model')
const User = require('../model/user-model')

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    });
};

const addReservasi = async (req, res) => {
    const { nama, no_meja, jadwal } = req.body
    const token = req.cookies.refreshToken
    let userId

    if (!nama || !no_meja || !jadwal || !token) {
        return res.status(400).json({ message: "Data reservasi tidak lengkap!" })
    }

    const jadwalDate = new Date(jadwal);
    const timestamp = new Date()

    if (jadwalDate < timestamp) {
        return res.status(400).json({ message: "Tidak bisa reservasi waktu mundur!" })
    }

    try {
        const reservasiExist = await Reservasi.findOne({ no_meja });

        if(reservasiExist) {
            return res.status(400).json({ message: "Nomor meja sudah di reservasi!" })
        }

        jwt.verify(String(token), process.env.JWT_SECRET_KEY, (err, user) => {
            if (err) {
                return res.status(400).json({ message: "Invalid Token" });
            }
            
            userId = user.userId;
        });

        const getUserData = await User.findById(userId)

        if (!getUserData) {
            return res.status(400).json({ message: "invalid auth" })
        }

        const email = getUserData.email

        const reservasiCode = randomstring.generate({
            length: 5,
            charset: 'numeric',
        });

        const transporter = createTransporter();
    
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Your Reservation Code',
            text: `This is your reservation code ${reservasiCode}`,
        };

        await Reservasi.create ({
            nama: nama,
            no_meja: no_meja,
            jadwal: jadwal,
            kode_reservasi: reservasiCode,
            user_id: getUserData._id
        })

        return new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending mails:', error);
                    reject('Failed to send mails');
                } else {
                    resolve('Reservasi code sent successfully');
                }
            });
        })
        .then((result) => {
            // Continue with any additional code here
            console.log(result);
            res.status(200).json({ message: "reservasi telah dibuat!"})
        })
        .catch((error) => {
            // Handle errors
            console.log(error.message);
            return res.status(500).json({ message: error.message });
        });      
    } catch (error) {
        console.log(error.message)
        res.status(500).json({message: error.message})
    }
}

const getReservasi = async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search_query || "";
    const skip = limit * page;

    const query = {
        nama: { $regex: search, $options: 'i' }   
    };

    try {
        const totalRows = await Reservasi.countDocuments(query);
        const totalPage = Math.ceil(totalRows / limit);
        const result = await Reservasi.find(query)
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

const deleteReservasi = async (req, res) => {
    const id = req.params.id

    try {
        const ReservasiToDelete = await Reservasi.findById(id)

        if(!ReservasiToDelete) {
            return res.status(404).json({ message: "Reservasi not found" })
        }

        const jadwalDate = new Date(ReservasiToDelete.jadwal);
        const timestamp = new Date();

        console.log(jadwalDate);
        console.log(timestamp);

        if (jadwalDate > timestamp) {
            console.log('gagal')
            return res.status(400).json({ message: "Gagal Membatalkan!" });
        }

        await Reservasi.findByIdAndDelete(id)
        res.status(200).json({ message: "Reservasi Successfully deleted" })     
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}

const ReservasiByCode = async (req, res) => {
    const { code } = req.body
    console.log(code)

    if (!code) {
        return res.status(400).json({ message: "input kode!" })
    }

    try {
        const reservasiExist = await Reservasi.findOne({ kode_reservasi: code })
        
        if (!reservasiExist) {
            return res.status(400).json({ message: "reservasi tidak di temukan!" })
        }

        res.status(200).json({ reservasiExist })
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}

const acceptReservasi = async (req, res) => {
    const id = req.params.id

    try {
        const reservasi = await Reservasi.findByIdAndDelete(id)
        res.status(200).json({ message: "berhasil di terima", reservasi })
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}

const ReservasiByUser = async (req, res) => {
    const { userId } = req.body

    try {
        const reservasi = await Reservasi.findOne({ user_id: userId })
        res.status(200).json({ reservasi })
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}

exports.addReservasi = addReservasi
exports.getReservasi = getReservasi
exports.deleteReservasi = deleteReservasi
exports.ReservasiByCode = ReservasiByCode
exports.acceptReservasi = acceptReservasi
exports.ReservasiByUser = ReservasiByUser