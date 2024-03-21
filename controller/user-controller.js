const nodemailer = require("nodemailer");
const randomstring = require("randomstring");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../model/user-model");
const Verification = require("../model/verification-model");

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });
};

const sendVerification = async (req, res) => {
  const { username, email } = req.body;

  if (!username || !email) {
    return res.status(400).json({ message: "Data tidak lengkap!" });
  }

  const UserExist = await User.findOne({ username: username });

  if (UserExist) {
    return res.status(400).json({ message: "Username sudah ada!" });
  }

  const userExist = await User.findOne({ email: email });

  if (userExist) {
    return res.status(400).json({ message: "email sudah terdaftar!" });
  }

  const emailExist = await Verification.findOne({ email });

  if (emailExist) {
    await Verification.findOneAndDelete({ email });
  }

  try {
    const transporter = createTransporter();

    const code = randomstring.generate({
      length: 6,
      charset: "numeric",
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Your Verification Code",
      text: `This is your verification code ${code}`,
    };

    const verify = await Verification.create({
      email: email,
      code: code,
    });

    // Set a timeout to delete the data after 60 seconds
    setTimeout(async () => {
      await Verification.findOneAndDelete({ email });
      console.log(`Verification code expires`);
    }, 60000);

    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending verification code:", error);
          reject("Failed to send verification code");
        } else {
          resolve("Verification code sent successfully");
        }
      });
    })
      .then((result) => {
        // Continue with any additional code here
        console.log(result);
        res
          .status(200)
          .json({ message: "Verification code is sent", verify: verify });
      })
      .catch((error) => {
        // Handle errors
        console.log(error.message);
        return res.status(500).json({ message: error.message });
      });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};

const RegisterCustomer = async (req, res) => {
  console.log(req.body);
  const { username, password, email, notelp, verifycode } = req.body;

  if (!username || !password || !email || !notelp || !verifycode) {
    return res.status(400).json({ message: "invalid credential" });
  }

  try {
    const getCode = await Verification.findOne({ email });

    if (!getCode) {
      return res.status(404).json({ message: "verification invalid/expired" });
    }

    if (verifycode == getCode.code) {
      const salt = await bcrypt.genSalt();
      const hashpassword = await bcrypt.hash(password, salt);

      const userInfo = await User.create({
        username: username,
        password: hashpassword,
        email: email,
        notelp: notelp,
        role: "customer",
      });

      await Verification.findOneAndDelete({ email });

      return res
        .status(201)
        .json({ message: "Account Created!", user: userInfo.username });
    }
    res.status(400).json({ message: "invalid verification code!" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};

const RegisterStaff = async (req, res) => {
  const { username, password, email, notelp, role } = req.body;

  if (!username || !password || !email || !role || !notelp) {
    return res.status(400).json({ message: "Data tidak lengkap!" });
  }

  const data = ["admin", "petugas"];

  if (!data.includes(role)) {
    return res.status(404).json({ message: "Role is unavailable" });
  }

  try {
    const userExist = await User.findOne({ username: username });

    if (userExist) {
      return res.status(400).json({ message: "Username sudah ada!" });
    }

    const emailExist = await User.findOne({ email: email });

    if (emailExist) {
      return res.status(400).json({ message: "Email sudah terdaftar!" });
    }

    const salt = await bcrypt.genSalt();
    const hashpassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username: username.trim(),
      password: hashpassword,
      role: role,
      email: email,
      notelp: notelp,
    });

    return res
      .status(201)
      .json({ success: "Akun berhasil dibuat!", user: user.username });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

const ForgetPassword = async (req, res) => {
  const { email } = req.body;

  const userExist = await User.findOne({ email });

  if (!userExist) {
    return res.status(404).json({ message: "email tidak terdaftar" });
  }

  try {
    const token = jwt.sign(
      {
        userId: userExist._id,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "5m" }
    );

    const url = `http://localhost:5173/reset/${token}`;

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Change Password",
      text: `Click here ${url}`,
    };

    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending verification code:", error);
          reject("Failed to send verification code");
        } else {
          resolve("Verification code sent successfully");
        }
      });
    })
      .then((result) => {
        // Continue with any additional code here
        console.log(result);
        res.status(200).json({ message: "url is sent to the Email address" });
      })
      .catch((error) => {
        // Handle errors
        console.log(error.message);
        return res.status(500).json({ message: error.message });
      });
  } catch (error) {
    console.log(error.message);
    return res.json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  const { newpassword, cpassword } = req.body;
  const token = req.params.token;
  let userId;

  try {
    jwt.verify(String(token), process.env.JWT_SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(400).json({ message: "Invalid Token" });
      }

      userId = user.userId;
    });

    if (newpassword !== cpassword) {
      return res
        .status(400)
        .json({ message: "confirm password tidak sesuai!" });
    }

    const userExist = await User.findById(userId);

    if (!userExist) {
      return res.status(404).json({ message: "An Error Occured" });
    }

    const salt = await bcrypt.genSalt();
    const hashpassword = await bcrypt.hash(newpassword, salt);

    userExist.password = hashpassword;

    // Save the updated password
    await userExist.save();

    res.status(200).send("Password berhasil di update!");
  } catch (error) {
    console.log(error.message);
    return res.json({ message: error.message });
  }
};

const Login = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Empty username or password!" });
  }

  try {
    const userExist = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!userExist || !(await bcrypt.compare(password, userExist.password))) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      {
        userId: userExist._id,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "10s" }
    );

    res.cookie("accessToken", token, {
      path: "/",
      expires: new Date(Date.now() + 1000 * 10), // 30 seconds
      httpOnly: true,
      secure: true
    });

    return res.status(201).json({ message: "Successfully Logged in!" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken || req.cookies.refreshToken;
  console.log(req.cookies)

  if (!token) {
    return res.status(404).json({ message: "Invalid Token!" });
  }

  jwt.verify(String(token), process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(400).json({ message: "Invalid Token" });
    }

    req.userId = user.userId;
  });
  next();
};

const UserCredential = async (req, res, next) => {
  const userId = req.userId;

  try {
    const user = await User.findById(userId, "-password");

    if (!user) {
      return res.status(404).json({ messsage: "User Not Found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

const refreshToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(404).json({ message: "Invalid Token!" });
  }

  jwt.verify(String(token), process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      console.log(err);
      return res.status(403).json({ message: "Authentication failed" });
    }

    res.clearCookie("accessToken");

    const token = jwt.sign(
      {
        userId: user.userId,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1hr" }
    );

    res.cookie("refreshToken", token, {
      path: "/",
      expires: new Date(Date.now() + 1000 * 60 * 60), // 1 Hour
      httpOnly: true,
      secure: true
    });

    req.userId = user.userId;
    next();
  });
};

const Logout = (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(400).json({ message: "Invalid Token" });
  }

  jwt.verify(String(token), process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      console.log(err);
      return res.status(403).json({ message: "Authentication failed" });
    }
    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Successfully Logged Out" });
  });
};

const getUser = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search_query || "";
  const role = req.query.role;
  const skip = limit * page;

  const query = {
    $or: [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ],
    role: { $ne: "customer" },
  };

  if (role) {
    query.role = { $regex: role, $options: "i" };
  }

  try {
    const totalRows = await User.countDocuments(query);
    const totalPage = Math.ceil(totalRows / limit);
    const result = await User.find(query)
      .select("-password")
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

const getUserById = async (req, res) => {
  const id = req.params.id;

  try {
    const UserData = await User.findById(id, "-password");
    res.status(200).json({ UserData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  const id = req.params.id;

  try {
    const UserToDelete = await User.findById(id);

    if (!UserToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(id);
    res.status(200).json({ message: "User Successfully deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

const UserStatistic = async (req, res) => {
  try {
    const Customer = await User.countDocuments({ role: "customer" });
    const Staff = await User.countDocuments({
      role: { $in: ["admin", "petugas"] },
    });
    const CustomerCount = Customer || 0;
    const UserCount = Customer + Staff;
    res.status(200).json({ CustomerCount, StaffCount: Staff, UserCount });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.sendVerification = sendVerification;
exports.RegisterCustomer = RegisterCustomer;
exports.RegisterStaff = RegisterStaff;
exports.ForgetPassword = ForgetPassword;
exports.changePassword = changePassword;
exports.Login = Login;
exports.verifyToken = verifyToken;
exports.UserCredential = UserCredential;
exports.refreshToken = refreshToken;
exports.Logout = Logout;
exports.getUser = getUser;
exports.deleteUser = deleteUser;
exports.UserStatistic = UserStatistic;
exports.getUserById = getUserById;
