const Midtrans = require("midtrans-client");
const Excel = require("exceljs");
const jwt = require("jsonwebtoken");
const User = require("../model/user-model");
const nodemailer = require("nodemailer");

const Transaction = require("../model/transaction-model");
const Order = require("../model/order-model");
const Product = require("../model/product-model");

const snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });
};

const createTransaction = async (req, res) => {
  const { OrderId, payload, customer, email } = req.body;

  const OrderExist = await Order.findOne({ OrderId });
  console.log(OrderExist);

  if (OrderExist) {
    return res.status(400).json({ message: "Error occured try again!" });
  }

  try {
    const grossAmount = payload.reduce((total, cartItem) => {
      return total + cartItem.harga * cartItem.quantity;
    }, 0);

    console.log(grossAmount, OrderId);

    // Construct item details for all products
    const itemDetails = payload.map((cartItem) => {
      return {
        name: cartItem.nama,
        price: cartItem.harga,
        quantity: cartItem.quantity,
      };
    });

    const invoice = {
      item_details: itemDetails,
      transaction_details: {
        order_id: OrderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: customer,
        email: email,
      },
    };

    const token = await snap.createTransactionToken(invoice);

    const transaction = await Transaction.create({
      order_id: OrderId,
      total: grossAmount,
    });

    res.status(201).json({ token, OrderId, transaction });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

const PaymentStatusById = async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log("this is id: ", orderId);

    // Retrieve payment status using Midtrans Snap client
    const paymentStatusResponse = await snap.transaction.status(orderId);

    // Extract payment status from the response
    const paymentStatus = paymentStatusResponse.transaction_status;

    // Return payment status to the client
    res.json({ status: paymentStatus });
  } catch (error) {
    // Handle errors
    console.error("Error checking payment status:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while checking payment status." });
  }
};

const addOrder = async (req, res) => {
  const io = req.app.get("socketio");
  const { nama_pemesan, no_meja, pesanan } = req.body;

  console.log(req.body);

  if (!nama_pemesan || !no_meja || !pesanan) {
    return res.status(500).json({ message: "data pesanan tidak lengkap!" });
  }

  try {
    const pesananItems = pesanan.map((item) => ({
      productId: item._id, // Assuming _id represents the product ID
      quantity: item.quantity,
    }));

    // Extract product IDs from pesanan
    const productId = pesanan.map((item) => item._id);

    // Retrieve product information for each pesanan
    const products = await Product.find({ _id: { $in: productId } });

    // Update stock for each product
    for (const item of pesanan) {
      const product = products.find(
        (p) => p._id.toString() === item._id.toString()
      );

      if (!product) {
        return res
          .status(404)
          .json({ message: `Product with ID ${item._id} not found` });
      }
      // Subtract quantity ordered from current stock
      product.stock -= item.quantity;
      await product.save();
    }

    const newOrder = await Order.create({
      nama_pemesan: nama_pemesan,
      no_meja: no_meja,
      pesanan: pesananItems,
    });

    io.emit("stockupdate");
    res.status(201).json({ message: "Pesanan dibuat!", pesanan: newOrder });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

const Notification = async (req, res) => {
  const io = req.app.get("socketio");
  const notificationJson = req.body;
  console.log(notificationJson);

  try {
    const {
      order_id: orderId,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      transaction_id,
      payment_type,
      settlement_time,
    } = notificationJson;

    if (fraudStatus == "accept") {
      await Transaction.updateOne(
        { order_id: orderId },
        {
          $set: {
            transaksi_id: transaction_id,
            tipe_pembayaran: payment_type,
          },
        }
      );
    }

    if (transactionStatus == "settlement") {
      await Transaction.updateOne(
        { order_id: orderId },
        {
          $set: {
            status_pembayaran: "settlement",
            waktu_pembayaran: settlement_time,
          },
        }
      );

      await Order.updateOne(
        { _id: orderId },
        { $set: { status_pesanan: "pending" } }
      );

      const FinishedTransaction = await Transaction.findOne({
        order_id: orderId,
      });
      const dataOrder = await Order.findById(orderId);

      const NotificationData = {
        FinishedTransaction,
        dataOrder,
      };

      io.emit("notification", NotificationData);
      console.log("status in settlement");
    } else if (
      transactionStatus == "cancel" ||
      transactionStatus === "expire"
    ) {
      await Transaction.updateOne(
        { order_id: orderId },
        { $set: { status_pembayaran: "failure" } }
      );
      console.log("status in failure");
    } else if (transactionStatus == "pending") {
      await Transaction.updateOne(
        { order_id: orderId },
        { $set: { status_pembayaran: "pending" } }
      );
      console.log("status in pending");
    }

    res.sendStatus(200); // Wajib 200
  } catch (error) {
    console.error("Error processing transaction notification:", error);
    res.sendStatus(500);
  }
};

const TransactionById = async (req, res) => {
  const orderId = req.params.id;

  try {
    const TransactionById = await Transaction.findOne({ order_id: orderId });
    console.log(TransactionById);
    res.status(200).json(TransactionById);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

const getOrder = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search_query || "";
  const status = req.query.status;
  const skip = limit * page;

  const query = {
    $or: [
      { nama_pemesan: { $regex: search, $options: "i" } },
      { no_meja: { $regex: search, $options: "i" } },
    ],
    status_pesanan: { $ne: "finished" },
  };

  if (status) {
    query.status_pesanan = { $regex: status, $options: "i" };
  }

  try {
    const totalRows = await Order.countDocuments(query);
    const totalPage = Math.ceil(totalRows / limit);
    const result = await Order.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ _id: -1 });

    res.json({
      result,
      page,
      limit,
      totalRows,
      totalPage,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getOrderById = async (req, res) => {
  const id = req.params.id;

  try {
    const OrderById = await Order.findById(id);
    console.log(OrderById);
    res.status(200).json(OrderById);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

const deleteOrder = async (req, res) => {
  const id = req.params.id;

  try {
    const OrderToDelete = await Order.findById(id);

    if (!OrderToDelete) {
      return res.status(404).json({ message: "Order not found" });
    }

    await Table.findByIdAndDelete(id);
    res.status(200).json({ message: "Order is cancelled" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

const OrderStatus = async (req, res) => {
  const id = req.params.id;
  const { newStatus } = req.body;
  const token = req.cookies.refreshToken;
  let userId;

  try {
    jwt.verify(String(token), process.env.JWT_SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(400).json({ message: "Invalid Token" });
      }

      userId = user.userId;
    });

    const getUserData = await User.findById(userId);

    if (!getUserData) {
      return res.status(400).json({ message: "invalid auth" });
    }

    await Order.findByIdAndUpdate(id, {
      status_pesanan: newStatus,
      id_penerima: getUserData._id,
    });
    res.status(200).json({ message: "berhasil update" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const HistoryStatistic = async (req, res) => {
  try {
    const FinishedCount = await Order.countDocuments({
      status_pesanan: "finished",
    });
    const PendingCount = await Transaction.countDocuments({
      status_pembayaran: "pending",
    });
    const FailureCount = await Transaction.countDocuments({
      status_pembayaran: "failure",
    });
    const SettlementCount = await Transaction.countDocuments({
      status_pembayaran: "settlement",
    });
    res
      .status(200)
      .json({ FinishedCount, PendingCount, FailureCount, SettlementCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const OrderStatistic = async (req, res) => {
  try {
    const UnpaidCount = await Order.countDocuments({
      status_pesanan: "unpaid",
    });
    const PendingCount = await Order.countDocuments({
      status_pesanan: "pending",
    });
    const totalOrder = UnpaidCount + PendingCount;
    res.status(200).json({ UnpaidCount, PendingCount, totalOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const GenerateReport = async (req, res) => {
  const { month, year } = req.body;

  try {
    const yearInt = parseInt(year);
    const monthInt = parseInt(month);

    const startDate = new Date(yearInt, monthInt - 1, 1);
    const endDate = new Date(yearInt, monthInt, 0);

    const orders = await Order.find({
      createdAt: {
        $gt: startDate,
        $lt: endDate,
      },
      status_pesanan: "finished",
    });

    if (!orders || orders.length == 0) {
      return res
        .status(400)
        .json({ message: "data doesnt exist within the date!" });
    }

    // Create a new Excel workbook
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet("Orders");

    // Add headers to the Excel file
    worksheet.addRow([
      "No",
      "ID Pesanan",
      "",
      "",
      "Nama Pemesan",
      "",
      "",
      "No Meja",
      "Tanggal",
      "",
      "Transaksi ID",
      "",
      "",
      "",
      "Tipe Pembayaran",
      "",
      "Status Pembayaran",
      "",
      "Total",
      "",
      "Waktu Pembayaran",
      "",
      "Penerima",
      "",
    ]);

    let rowNum = 0;
    let merge = 1;

    worksheet.mergeCells(`B${merge}:D${merge}`);
    worksheet.mergeCells(`E${merge}:G${merge}`);
    worksheet.mergeCells(`I${merge}:J${merge}`);
    worksheet.mergeCells(`K${merge}:N${merge}`);
    worksheet.mergeCells(`O${merge}:P${merge}`);
    worksheet.mergeCells(`Q${merge}:R${merge}`);
    worksheet.mergeCells(`S${merge}:T${merge}`);
    worksheet.mergeCells(`U${merge}:V${merge}`);
    worksheet.mergeCells(`W${merge}:X${merge}`);

    // Process each order
    for (const order of orders) {
      // Find transactions associated with the current order ID
      const transactions = await Transaction.find({ order_id: order._id });
      const penerima = await User.find({ _id: order.id_penerima });

      penerima.forEach(async (receiver) => {
        // Add data for each transaction associated with the current order
        transactions.forEach(async (transaction) => {
          rowNum++;
          merge++;
          const row = worksheet.addRow([
            rowNum, // Add auto-incremented number
            order._id.toString(),
            "",
            "",
            order.nama_pemesan,
            "",
            "",
            parseInt(order.no_meja),
            order.createdAt,
            "",
            transaction.transaksi_id,
            "",
            "",
            "",
            transaction.tipe_pembayaran,
            "",
            transaction.status_pembayaran,
            "",
            transaction.total.toLocaleString("id-ID", {
              style: "currency",
              currency: "IDR",
            }),
            "",
            transaction.waktu_pembayaran,
            "",
            receiver.username,
            "",
          ]);
          // Set alignment to left for each cell in the row
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.alignment = { horizontal: "left" };
          });

          // Merge cells and set alignment for merged cells
          worksheet.mergeCells(`B${merge}:D${merge}`);
          worksheet.mergeCells(`E${merge}:G${merge}`);
          worksheet.mergeCells(`I${merge}:J${merge}`);
          worksheet.mergeCells(`K${merge}:N${merge}`);
          worksheet.mergeCells(`O${merge}:P${merge}`);
          worksheet.mergeCells(`Q${merge}:R${merge}`);
          worksheet.mergeCells(`S${merge}:T${merge}`);
          worksheet.mergeCells(`U${merge}:V${merge}`);
          worksheet.mergeCells(`W${merge}:X${merge}`);

          // Set alignment for merged cells
          const mergedCells = ["B", "E", "I", "K", "O", "Q", "S", "U"];
          mergedCells.forEach((col) => {
            worksheet.getCell(`${col}${merge}`).alignment = {
              horizontal: "left",
            };
          });
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    // Send the Excel file buffer as a response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Laporan_Data_Resto.xlsx"
    );
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const EmailPDF = async (req, res) => {
  const file = req.file;
  const { email } = req.body;

  console.log(file);
  console.log(email);

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "PDF Bukti Pembayaran Resto",
      text: `PDF`,
      attachments: [
        {
          filename: file.originalname,
          content: file.buffer,
        },
      ],
    };

    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
          reject("Failed to send PDF");
        } else {
          resolve("PDF Sent to email");
        }
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.addOrder = addOrder;
exports.getOrder = getOrder;
exports.getOrderById = getOrderById;
exports.deleteOrder = deleteOrder;
exports.OrderStatus = OrderStatus;
exports.createTransaction = createTransaction;
exports.PaymentStatusById = PaymentStatusById;
exports.Notification = Notification;
exports.TransactionById = TransactionById;
exports.HistoryStatistic = HistoryStatistic;
exports.OrderStatistic = OrderStatistic;
exports.GenerateReport = GenerateReport;
exports.EmailPDF = EmailPDF;
