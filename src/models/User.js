const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    image: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: [validator.isEmail, "Provide A Valid Email!"],
    },
    personalEmail: {
      type: String,
      required: true,
      unique: true,
      validate: [validator.isEmail, "Provide A Valid Email!"],
    },
    password: {
      type: String,
      required: true,
      validate: {
        validator: function (value) {
          // Regex updated to include at least one special character
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
            value
          );
        },
        message:
          "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
      },
    },
    role: {
      type: String,
      enum: ["admin", "superadmin", "hr", "user", "delivery", "accounts"],
      default: "user",
    },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "organization" },
    profilePic: { type: String, default: "" },
    department: { type: String, default: "" },
    designation: { type: String, default: "" },
    extension: { type: String, default: "" },
    profilePic: { type: String, default: "" },
    reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    seatingLocation: { type: String, default: "" },
    workPhone: { type: String, default: "" },
    personalMobile: { type: String, default: "" },
    otp: { type: String },
    otpExpires: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Hash password before saving to DB
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("User", userSchema);