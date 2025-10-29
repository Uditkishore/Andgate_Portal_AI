const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    // Screening
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
    },
    communication: {
        type: Number,
        min: 1,
        max: 5,
    },
    confidence: {
        type: Number,
        min: 1,
        max: 5,
    },
    remark: {
        type: String,
        trim: true,
    },
    decision: {
        type: String,
        trim: true,
    },

    //Technical Smincon
    constraints: {
        type: Number,
        min: 1,
        max: 5,
    },
    assertion: {
        type: Number,
        min: 1,
        max: 5
    },
    coverage: {
        type: Number,
        min: 1,
        max: 5
    },
    problemSolving: {
        type: Number,
        min: 1,
        max: 5
    },
    protocols: { type: String },
    scripting: { type: String },
    systemVerilog: { type: String },
    technicalSkills: { type: String },
    uvm: { type: String },
    verilog: { type: String }
},
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = mongoose.model('Feedback', feedbackSchema);