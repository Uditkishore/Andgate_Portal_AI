const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const dbConnection = async () => {
    try {
        console.log(process.env.MONGO_URL)
        mongoose.connect(process.env.MONGO_URL);
        console.log("database connected");
    } catch (error) {
        console.log("Connection error:", error);
    }
};

module.exports = dbConnection;
