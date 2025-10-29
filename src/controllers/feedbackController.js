const Feedback = require("../models/feedback");
const Event = require("../models/event");
const mongoose = require('mongoose')


exports.createFeedback = async (req, res) => {
    const {
        eventId,
        communication,
        confidence,
        remark,
        decision,
        constraints,
        coverage,
        assertion,
        uvm,
        systemVerilog,
        verilog,
        technicalSkills,
        problemSolving,
        scripting,
        protocols,
    } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: "Invalid eventId format" });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        if (event.eventName === "Screening" || event.eventName === "Orientation") {
            if (!communication || !confidence || !remark || !decision) {
                return res.status(400).json({ message: "Please fill all fields" });
            }

            const feedback = new Feedback({
                communication,
                confidence,
                remark,
                decision,
                eventId,
            });

            await feedback.save();
            await Event.findByIdAndUpdate({ _id: eventId }, { status: "submitted" })
            return res.status(200).json({ message: "Feedback processed" });
        } else if (
            event.eventName === "Technical 1" ||
            event.eventName === "Technical 2" ||
            event.eventName === "Technical 3" ||
            event.eventName === "Client 1" ||
            event.eventName === "Client 2" ||
            event.eventName === "Client 3") {
            const feedbackDetails = new Feedback({
                eventId,
                communication,
                remark,
                decision,
                constraints,
                coverage,
                assertion,
                uvm,
                systemVerilog,
                verilog,
                technicalSkills,
                problemSolving,
                scripting,
                protocols,
            });

            await feedbackDetails.save();
            await Event.findByIdAndUpdate({ _id: eventId }, { status: "submitted" })
            return res.status(200).json({ message: "Feedback processed" });
        }

        return res.status(400).json({ message: "Invalid event name for feedback" });
    } catch (error) {
        console.error("Failed Creating Feedback:", error);
        return res.status(500).json({
            message: "Error creating feedback",
            error: error.message,
        });
    }
};

exports.isFeedbackExists = async (req, res) => {
    const { eventId } = req.params;
    try {

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: "Invalid eventId format" });
        }

        const feedback = await Feedback.findOne({ eventId: eventId }).sort({ createdAt: -1 });

        if (!feedback) {
            return res.status(200).json({ success: true, status: false });
        }

        return res.status(200).json({
            success: true,
            status: true
        })

    } catch (error) {
        console.error("Failed Getting Feedback:", error);
        return res.status(500).json({
            message: "Error getting feedback",
            error: error.message,
        });
    }
}

exports.getFeedbackByEventId = async (req, res) => {
    const { eventId } = req.params;
    try {

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: "Invalid eventId format" });
        }

        const feedback = await Feedback.findOne({ eventId: eventId }).sort({ createdAt: -1 });

        if (!feedback) {
            return res.status(200).json({ success: true, status: false });
        }

        return res.status(200).json({
            success: true,
            data: feedback
        })

    } catch (error) {
        console.error("Failed Getting Feedback:", error);
        return res.status(500).json({
            message: "Error getting feedback",
            error: error.message,
        });
    }
}

