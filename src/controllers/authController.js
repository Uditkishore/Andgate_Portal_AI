const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Organization = require("../models/company");
const mongoose = require("mongoose");

const transporter = require("../utils/mailer");
const { newUserTemplate, ForgetPass } = require("../utils/emailTemplates");

// Register a new user
const registerUser = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    role,
    reportingTo,
    companyEmail,
  } = req.body;

  const user = req.user;
  const workEmail = companyEmail.toLowerCase().trim();
  const personalEmail = email.toLowerCase().trim();

  try {
    const existingUser = await User.findOne({ email: workEmail });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists." });
    }

    const newUser = new User({
      firstName,
      lastName,
      password,
      email: workEmail,
      personalEmail,
      organization: user.organization,
      role: role ? role.toLowerCase() : "user",
      reportingTo: reportingTo ? reportingTo.toLowerCase() : null,
    });

    await newUser.save();

    const company = await Organization.findById(user.organization);
    let loginLink = `${process.env.FRONTEND_URL}`;

    // 📧 Prepare HTML email
    if (company.organization) {
      const personalizedHtml = newUserTemplate
        .replace(/{{firstName}}/g, firstName)
        .replace(/{{email}}/g, workEmail)
        .replace(/{{password}}/g, password) // Note: consider omitting or masking password in production emails
        .replace(/{{organization}}/g, company.organization)
        .replace(/{{loginLink}}/g, loginLink)
        .replace(/{{year}}/g, "2025");

      const mailOptions = {
        from: `"Andgate HR Team" <${process.env.SMTP_USER}>`,
        to: personalEmail,
        subject: `Account Successfully Created for ${company.organization}`,
        text: `Dear ${firstName},\n\nYour account has been created successfully.\n\n- Andgate HR Team`,
        html: personalizedHtml,
      };

      const info = await transporter.sendMail(mailOptions);

      if (info.rejected.length > 0) {
        return res.status(500).json({
          status: false,
          message: "Email rejected. Please provide a valid email.",
          error: `Rejected for: ${info.rejected.join(", ")}`,
        });
      }
    }
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Error registering user:", err.message);

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: errors.join(", ") });
    }

    res
      .status(500)
      .json({ message: "Error registering user", error: err.message });
  }
};

// Login an existing user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials." });

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in the environment variables.");
      return res
        .status(500)
        .json({ message: "Server configuration error: JWT secret missing." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });

    res.status(200).json({
      status: true,
      token,
    });
  } catch (err) {
    console.error("Error logging in:", err.message);
    res.status(500).json({ message: "Error logging in", error: err.message });
  }
};

// Get User Details By ID
const getUserDetailsById = async (req, res) => {
  const userID = req.params.id;

  try {
    const result = await User.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(userID) },
      },
      // Lookup for organization
      {
        $lookup: {
          from: "organizations",
          localField: "organization",
          foreignField: "_id",
          as: "organizationDetails",
        },
      },
      {
        $unwind: {
          path: "$organizationDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "reportingTo",
          foreignField: "_id",
          as: "reportingUser",
        },
      },
      {
        $unwind: {
          path: "$reportingUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          organization: "$organizationDetails.organization",
          reportingTo: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$reportingUser.firstName", ""] },
                  " ",
                  { $ifNull: ["$reportingUser.lastName", ""] },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          organizationDetails: 0,
          reportingUser: 0,
        },
      },
    ]);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ status: true, data: result[0] });
  } catch (error) {
    console.error("Error getting user:", error.message);
    res.status(500).json({
      message: "Error getting user",
      error: error.message,
    });
  }
};

const getAllHrs = async (req, res) => {
  try {
    const getAllHr = await User.find(
      {
        role: "hr",
      },
      {
        _id: 1,
        firstName: 1,
        lastName: 1,
      }
    );

    if (!getAllHr) {
      return res.status(404).json({
        status: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      status: true,
      data: getAllHr,
    });
  } catch (error) {
    console.error("Error fetching Hr list:", error);

    return res.status(500).json({
      status: false,
      message: "Error fetching Hr list.",
      error: error.message,
    });
  }
};

const getAllAdminAndHrs = async (req, res) => {
  try {
    const users = await User.find(
      { role: { $in: ["admin", "hr"] } },
      { password: 0 }
    )
      .lean()
      .exec();
    if (!users) return res.status(404).json({ message: "No users found." });

    res.status(200).json({ status: true, data: users });
  } catch (error) {
    console.error("Error getting users:", error.message);
    res
      .status(500)
      .json({ message: "Error getting users", error: error.message });
  }
};

const getEveryUser = async (req, res) => {
  const { userType, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    let filter = {};

    // Apply role-based filters
    if (userType === "hr") {
      filter.role = "hr";
    } else if (userType === "admin") {
      filter.role = { $in: ["admin", "superadmin"] };
    } else if (userType === "delivery") {
      filter.role = "delivery";
    } else {
      filter.role = { $nin: ["admin", "hr", "superadmin", "delivery"] };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const users = await User.find(filter, { password: 0 })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalUsers = await User.countDocuments(filter);

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found." });
    }

    return res.status(200).json({
      status: true,
      users,
      pagination: {
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        pageSize: limit,
      },
    });
  } catch (error) {
    console.error("Error getting users:", error.message);
    return res
      .status(500)
      .json({ message: "Error getting users", error: error.message });
  }
};

const updateProfile = async (req, res) => {
  const userId = req.user.id;

  const allowedFields = new Set([
    "image",
    "workPhone",
    "personalMobile",
    "extension",
    "department",
    "designation",
    "reportingTo",
    "seatingLocation",
    "organization",
  ]);

  const updateData = Object.entries(req.body).reduce((acc, [key, value]) => {
    if (!allowedFields.has(key)) return acc;

    if (key === "reportingTo") {
      if (value) acc[key] = value;
    } else if (typeof value === "string" && value.trim()) {
      acc[key] = value.trim();
    }

    return acc;
  }, {});

  if (Object.keys(updateData).length === 0) {
    return res
      .status(400)
      .json({ message: "No valid fields provided for update." });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ status: true, data: updatedUser });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    return res
      .status(500)
      .json({ message: "Error updating profile", error: error.message });
  }
};

// Send OTP
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpires = Date.now() + 10 * 60 * 1000; // expires in 10 mins

    user.otp = otp;
    user.otpExpires = otpExpires;
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          otp,
          otpExpires,
        },
      }
    );

    //Sending Email
    const forgetPassHtml = ForgetPass.replace(/{{firstName}}/g, user.firstName)
      .replace(/{{otp}}/g, user.otp)
      .replace(/{{organization}}/g, user.organization)
      .replace(/{{year}}/g, "2025");

    const mailOptions = {
      from: `"Andgate Support Team" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Account Successfully Created for ${user.organization}`,
      text: `Dear ${user.firstName},\n\nYour OTP for Password Reset is: ${user.otp}.\n\n- Andgate HR Team`,
      html: forgetPassHtml,
    };

    const info = await transporter.sendMail(mailOptions);

    if (info.rejected.length > 0) {
      return res.status(500).json({
        status: false,
        message: "Email rejected. Please provide a valid email.",
        error: `Rejected for: ${info.rejected.join(", ")}`,
      });
    }

    res.status(200).json({ message: "OTP sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.otp !== otp || Date.now() > user.otpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.status(200).json({ message: "OTP verified" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || Date.now() > user.otpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Option 1: Let pre-save hook hash the password
    user.password = newPassword; // plain text
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserDetailsById,
  getAllHrs,
  getAllAdminAndHrs,
  getEveryUser,
  updateProfile,
  resetPassword,
  verifyOtp,
  sendOtp,
};
