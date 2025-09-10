const Event = require("../models/Event");

exports.createEvent = async (req, res) => {
  try {
    const { title, startAt, endAt, capacity } = req.body;
    const event = await Event.create({ title, startAt, endAt, capacity });
    res.status(201).json(event);
  } catch {
    res.status(500).json({ error: "Failed to create event" });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const { status, page, pageSize, sort } = req.query;
    const query = {};
    const now = new Date();
    if (status === "upcoming") query.startAt = { $gt: now };
    else if (status === "ongoing") {
      query.startAt = { $lte: now };
      query.endAt = { $gte: now };
    } else if (status === "past") query.endAt = { $lt: now };

    const sortObj = {};
    if (sort) {
      const field = sort.replace(/^-/, "");
      sortObj[field] = sort.startsWith("-") ? -1 : 1;
    }

    const cursor = Event.find(query).sort(sortObj);
    if (page && pageSize) {
      const pageNum = parseInt(page, 10) || 1;
      const size = parseInt(pageSize, 10) || 10;
      const total = await Event.countDocuments(query);
      const items = await cursor.skip((pageNum - 1) * size).limit(size);
      return res.json({ items, total });
    }
    const events = await cursor;
    res.json(events);
  } catch {
    res.status(500).json({ error: err.tostring });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch {
    res.status(500).json({ error: "Failed to fetch event" });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const event = await Event.findByIdAndUpdate(id, update, { new: true });
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch {
    res.status(500).json({ error: "Failed to update event" });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete event" });
  }
};

exports.registerForEvent = async (req, res) => {
  try {
    const userId = req.user._id;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.registeredUsers.some((u) => u.toString() === userId.toString()))
      return res.status(400).json({ error: "Already registered" });
    if (event.registeredUsers.length >= event.capacity)
      return res.status(400).json({ error: "Event full" });
    if (new Date() > event.startAt)
      return res.status(400).json({ error: "Registration closed" });
    event.registeredUsers.push(userId);
    await event.save();
    res.json({ message: "Registered successfully" });
  } catch {
    res.status(500).json({ error: "Failed to register" });
  }
};
