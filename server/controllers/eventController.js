const Event = require("../models/Event");

exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({ message: "Event created", event });
  } catch (err) {
    res.status(500).json({ error: "Failed to create event" });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { type: category } : {};

    const events = await Event.find(filter).sort({ date: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    res.json(event);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch event" });
  }
};

exports.registerForEvent = async (req, res) => {
  try {
    const userId = req.user._id;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const alreadyRegistered = event.registeredUsers.some(
      (entry) => entry.user.toString() === userId.toString()
    );

    if (alreadyRegistered)
      return res.status(400).json({ error: "Already registered" });

    if (new Date() > event.registrationDeadline)
      return res.status(400).json({ error: "Registration closed" });

    event.registeredUsers.push({ user: userId });
    await event.save();

    res.json({ message: "Registered successfully. Await admin approval." });
  } catch (err) {
    res.status(500).json({ error: "Failed to register" });
  }
};
