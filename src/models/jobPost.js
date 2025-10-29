const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        default: ""
    },
    location: {
        type: String,
        required: true,
        trim: true,
        default: ""
    },
    status: {
        type: String,
        enum: ["Active", "Inactive", "On Hold", "Filled"],
        default: "Active"
    },
    organization: {
        type: String,  
        required: true,
        trim: true,
        default: ""
    },
    clientName: {
        type: String,
        required: true,
        trim: true,
        default: ""
    },
    experienceMin: {
        type: Number,
        required: true,
        min: 0,
    },
    experienceMax: {
        type: Number,
        required: true,
        min: 0,
    },
    noOfPositions: {
        type: Number,
        required: true,
        min: 1,
    },
    description: {
        type: String,
        required: true,
        trim: true,
        default: ""
    },
    skills: {
        type: [String],
        required: true
    },
    priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium"
    },
    postDate: {
        type: Date,
        default: Date.now,
    },
    endDate: {
        type: Date,
        required: true,
    },
    candidates: [
        {
            candidate: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "candidate", 
            },
            addedByHR: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
            addedAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.Job || mongoose.model("Job", JobSchema);