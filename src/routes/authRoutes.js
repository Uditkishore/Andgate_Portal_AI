const express = require("express");
const {
  registerUser,
  loginUser,
  getUserDetailsById,
  getAllHrs,
  getAllAdminAndHrs,
  getEveryUser,
  updateProfile,
  sendOtp,
  verifyOtp,
  resetPassword,
} = require("../controllers/authController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/register", authMiddleware, registerUser);
router.post("/login", loginUser);
router.get("/getUserById/:id", authMiddleware, getUserDetailsById);
router.get("/getAllAdminAndHrs", authMiddleware, getAllAdminAndHrs);
router.get("/get_all_hr", getAllHrs);
router.get("/get_every_user", authMiddleware, getEveryUser);
router.patch("/update_profile", authMiddleware, updateProfile);

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

module.exports = router;
