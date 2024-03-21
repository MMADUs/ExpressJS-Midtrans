const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken');

const Feedback = require('../model/feedback-model')
const Order = require('../model/order-model')

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    });
};

const sendEmail = async (req, res) => {
    const { orderId, email } = req.body;

    const orderExist = await Order.findOne({ _id: orderId })

    if(!orderExist) {
        return res.status(404).json({ message:"pesan terlebih dahulu!" })
    }

    try {
        const token = jwt.sign({ 
            orderId: orderExist.id,
            email: email
        }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        console.log(token)

        const url = `http://localhost:5173/feedback/${token}`

        const transporter = createTransporter();
    
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Feedback for our resto',
            text: `We would like to have your feedback, Click here ${url}`,
        };
    
        return new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending verification code:', error);
                    reject('Failed to send verification code');
                } else {
                    resolve('Verification code sent successfully');
                }
            });
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
};

const addFeedback = async (req, res) => {
    const { rate, feedback } = req.body
    const token = req.params.token

    // declare to make it readable
    let orderId
    let email

    if(!rate || !feedback) {
        return res.status(400).json({ message: "Data tidak lengkap!" })
    }

    jwt.verify(String(token), process.env.JWT_SECRET_KEY, (err, order) => {
        if (err) {
            return res.status(400).json({ message: "Invalid Token" });
        }
        
        orderId = order.orderId
        email = order.email
    });

    const FeedbackExist = await Feedback.findOne({ order_id: orderId })
    console.log(FeedbackExist)

    if (FeedbackExist) {
        return res.status(400).json({ message:"1 feedback for 1 order!" })
    }

    try {
        await Feedback.create ({
            order_id: orderId,
            email: email,
            rate: rate,
            feedback: feedback
        })

        res.status(200).json({ message: "Feedback has been applied!"})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({message: error.message})
    }
}

const getFeedback = async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search_query || "";
    const skip = limit * page;

    const query = {
        email: { $regex: search, $options: 'i' }   
    };

    try {
        const totalRows = await Feedback.countDocuments(query);
        const totalPage = Math.ceil(totalRows / limit);
        const result = await Feedback.find(query)
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

const feedbackStatistic = async (req, res) => {
    try {
        const lowFeedback = await Feedback.countDocuments({ rate: { $in: [1, 2] } })
        const goodFeedback = await Feedback.countDocuments({ rate: { $in: [2, 3] } })
        const highFeedback = await Feedback.countDocuments({ rate: 5 })
        const totalFeedback = lowFeedback + goodFeedback + highFeedback
        res.status(200).json({ lowFeedback, goodFeedback, highFeedback, totalFeedback })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal server error" });
    }
}

exports.sendEmail = sendEmail
exports.addFeedback = addFeedback
exports.getFeedback = getFeedback
exports.feedbackStatistic = feedbackStatistic