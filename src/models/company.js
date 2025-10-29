const mongoose = require("mongoose");
const validator = require("validator");

const OrganizationSchema = new mongoose.Schema({
    organization: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        validate: [validator.isEmail, "Please provide a valid email"],
    },
    phone: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^[0-9]{10,15}$/.test(v);
            },
            message: (props) => `${props.value} is not a valid phone number!`,
        },
    },
    address: {
        type: String,
        required: true,
    },
    website: {
        type: String,
        validate: {
            validator: function (v) {
                return !v || validator.isURL(v);
            },
            message: "Invalid URL",
        },
    },
    industry: {
        type: String,
        enum: [
            "IT",
            "Finance",
            "Healthcare",
            "Education",
            "Manufacturing",
            "SemiConductor",
            "Other",
        ],
        default: "Other",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
        logo: {  
        type: String,  
        required: false,
    }
}, {
    timestamps: true,
    versionKey: false,
});

module.exports = mongoose.model("organization", OrganizationSchema);
