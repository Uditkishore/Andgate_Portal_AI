const Event = require("../models/event");
const Candidate = require("../models/candidate");
const {
  interviewerHtml,
  candidateHtml,
  candidateHtmlWithoutLink,
  interviewerHtmlWithoutLink,
  eventRejectionHtml,
  eventApprovalHtml
} = require("../utils/emailTemplates");
const transporter = require("../utils/mailer");

exports.createEvent = async (req, res) => {
  const {
    candidate,
    interviewer,
    scheduledBy,
    eventName,
    interviewDate,
    meetingLink,
    notes,
    organization,
  } = req.body;

  try {
    // Validate required fields
    const requiredFields = {
      "candidate.name": candidate?.name,
      "candidate.email": candidate?.email,
      "candidate.mobile": candidate?.mobile,
      "interviewer.interviewerId": interviewer?.interviewerId,
      "interviewer.name": interviewer?.name,
      "interviewer.email": interviewer?.email,
      scheduledBy: scheduledBy,
      eventName: eventName,
      interviewDate: interviewDate,
      "organization.companyId": organization?.companyId,
      "organization.name": organization?.name,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields.",
        missingFields,
      });
    }

    // Create event
    const newEvent = await Event.create({
      candidate,
      interviewer,
      scheduledBy,
      eventName,
      interviewDate,
      meetingLink,
      notes,
      organization,
    });

    // Helper to build email content
    const createEmail = (to, subject, html) => ({
      from: `"Andgate HR Team" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: `Dear- Andgate HR Team`,
      html,
    });

    let feedbackLinTechnical = `${process.env.FRONTEND_URL}${process.env.TECHNICAL_URL}/${newEvent._id}`;
    let feedbackLinScreening = `${process.env.FRONTEND_URL}${process.env.SCREENING_URL}/${newEvent._id}`;

    let personalizedCandidateHtml;
    let personalizedInterviewerHtml;

    if (meetingLink && meetingLink.trim() !== "") {
      personalizedCandidateHtml = candidateHtml
        .replace("{{candidate.name}}", candidate.name)
        .replace("{{organization.name}}", organization.name)
        .replace("{{eventName}}", eventName)
        .replace("{{interviewer.name}}", interviewer.name)
        .replace("{{interviewDate}}", new Date(interviewDate).toLocaleString())
        .replace("{{meetingLink}}", meetingLink)
        .replace("{{currentYear}}", 2025);

      personalizedInterviewerHtml = interviewerHtml
        .replace("{{interviewer.name}}", interviewer.name)
        .replace("{{candidate.name}}", candidate.name)
        .replace("{{eventName}}", eventName)
        .replace("{{interviewDate}}", new Date(interviewDate).toLocaleString())
        .replace("{{meetingLink}}", meetingLink)
        .replace("{{feedbackLink}}", feedbackLinTechnical)
        .replace("{{currentYear}}", 2025);
    } else {
      personalizedCandidateHtml = candidateHtmlWithoutLink
        .replace("{{candidate.name}}", candidate.name)
        .replace("{{organization.name}}", organization.name)
        .replace("{{eventName}}", eventName)
        .replace("{{interviewer.name}}", interviewer.name)
        .replace("{{interviewDate}}", new Date(interviewDate).toLocaleString())
        .replace("{{currentYear}}", 2025);

      personalizedInterviewerHtml = interviewerHtmlWithoutLink
        .replace("{{interviewer.name}}", interviewer.name)
        .replace("{{candidate.name}}", candidate.name)
        .replace("{{candidate.email}}", candidate.email)
        .replace("{{candidate.mobile}}", candidate.mobile)
        .replace("{{feedbackLink}}", feedbackLinScreening)
        .replace("{{eventName}}", eventName)
        .replace("{{interviewDate}}", new Date(interviewDate).toLocaleString())
        .replace("{{currentYear}}", 2025);
    }

    // Send emails
    const candidateEmail = createEmail(
      candidate.email,
      `Interview Scheduled for ${candidate.name} - ${eventName} Round`,
      personalizedCandidateHtml
    );

    const interviewerEmail = createEmail(
      interviewer.email,
      `Interview Assignment for ${candidate.name} - ${eventName} Round`,
      personalizedInterviewerHtml
    );

    await Promise.all([
      transporter.sendMail(candidateEmail),
      transporter.sendMail(interviewerEmail),
    ]);

    return res.status(201).json({
      status: true,
      message: "Event created and emails sent successfully.",
      data: newEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to create event.",
      error: error.message,
    });
  }
};

exports.getEventsByCandidateId = async (req, res) => {
  const user = req.user;
  const { candidateId } = req.params;

  try {
    if (!candidateId) {
      return res.status(400).json({
        status: false,
        message: "Candidate ID is required.",
      });
    }

    const events = await Event.find({
      "candidate.candidateId": candidateId,
      scheduledBy: user._id,
    });

    if (events.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No events found for this candidate.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Events fetched successfully.",
      data: events,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch events.",
      error: error.message,
    });
  }
};

exports.updateFeedbackStatus = async (req, res) => {
  const { eventId } = req.params;
  const { status } = req.body;

  try {
    if (!eventId || !status) {
      return res.status(400).json({
        success: false,
        message: "Event ID and status are required.",
      });
    }
    const validStatuses = ['pending', 'submitted', 'approved', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value.",
      });
    }
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found for the given event ID.",
      });
    }

    if (status === 'rejected') {
      const rejectionEmail = {
        from: `"Andgate HR Team" <${process.env.SMTP_USER}>`,
        to: event.candidate.email,
        subject: `Interview Update for ${event.candidate.name} - ${event.eventName} Round`,
        text: `Dear- Andgate HR Team`,
        html: eventRejectionHtml
          .replace(/{{candidateName}}/g, event.candidate.name)
          .replace(/{{organization}}/g, event.organization.name)
          .replace(/{{eventName}}/g, event.eventName)
          .replace(/{{year}}/g, new Date().getFullYear()),
      };

      await transporter.sendMail(rejectionEmail);

      await Candidate.findByIdAndUpdate(event.candidate.candidateId, { status: 'rejected' });
    }

    if (status === 'approved') {
      const approvalEmail = {
        from: `"Andgate HR Team" <${process.env.SMTP_USER}>`,
        to: event.candidate.email,
        subject: `Interview Update for ${event.candidate.name} - ${event.eventName} Round`,
        text: `Dear- Andgate HR Team`,
        html: eventApprovalHtml
          .replace(/{{candidateName}}/g, event.candidate.name)
          .replace(/{{organization}}/g, event.organization.name)
          .replace(/{{eventName}}/g, event.eventName)
          .replace(/{{year}}/g, new Date().getFullYear()),
      };

      await transporter.sendMail(approvalEmail);
    }

    event.status = status;
    await event.save();

    return res.status(200).json({
      success: true,
      message: "Event status updated successfully",
      data: "updated",
    });
  } catch (error) {
    console.error("Failed to update event status:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating event status",
      error: error.message,
    });
  }
};
