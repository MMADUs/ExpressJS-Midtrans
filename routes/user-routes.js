const express = require('express');
const router = express.Router();

const {
    sendVerification,
    RegisterCustomer,
    RegisterStaff,
    ForgetPassword,
    changePassword,
    Login,
    verifyToken,
    UserCredential,
    refreshToken,
    Logout,
    getUser,
    deleteUser,
    UserStatistic,
    getUserById
} = require('../controller/user-controller');

router.post('/send', sendVerification);
router.post('/register', RegisterCustomer);
router.post('/add', RegisterStaff);
router.post('/forget', ForgetPassword);
router.patch('/change/:token', changePassword);
router.post('/login', Login);
router.get('/user', verifyToken, UserCredential);
router.get('/refresh', refreshToken, verifyToken, UserCredential);
router.get('/logout', Logout);
router.get('/get', getUser);
router.delete('/delete/:id', deleteUser);
router.get('/statistic', UserStatistic);
router.get('/details/:id', getUserById);

module.exports = router;