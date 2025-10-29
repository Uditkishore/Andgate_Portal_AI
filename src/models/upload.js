const mongoose = require("mongoose");

const uploadSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    fileType: { type: String, enum: ["pdf", "doc", "docx"], required: true },
    filePath: { type: String },
}, {
    versionKey: false,
    timestamps: true
});

module.exports = mongoose.model("upload", uploadSchema);
