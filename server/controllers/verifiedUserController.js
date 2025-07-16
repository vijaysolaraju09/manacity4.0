const VerifiedUser = require("../models/VerifiedUser");
const User = require("../models/User");

exports.applyForVerification = async (req, res) => {
  try {
    const { profession, bio } = req.body;
    const user = req.user._id;

    const alreadyApplied = await VerifiedUser.findOne({ user });
    if (alreadyApplied)
      return res.status(400).json({ error: "Already applied or approved" });

    const request = await VerifiedUser.create({ user, profession, bio });
    res.status(201).json({ message: "Request submitted", request });
  } catch (err) {
    res.status(500).json({ error: "Verification request failed" });
  }
};

exports.getAllVerifiedUsers = async (req, res) => {
  try {
    const list = await VerifiedUser.find({ status: "approved" }).populate(
      "user",
      "name phone location address"
    );
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch verified users" });
  }
};

exports.markInterest = async (req, res) => {
  try {
    const verifiedId = req.params.id;
    const userId = req.user._id;

    const verified = await VerifiedUser.findById(verifiedId);
    if (!verified)
      return res.status(404).json({ error: "Verified user not found" });

    const alreadyConnected = verified.connections.some(
      (c) => c.user.toString() === userId.toString()
    );

    if (!alreadyConnected) {
      verified.connections.push({ user: userId, status: "pending" });
      await verified.save();
    }

    res.json({ message: "Interest marked successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark interest" });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const verified = await VerifiedUser.findOne({ user: req.user._id });
    if (!verified) return res.status(404).json({ error: "Not verified" });

    const pending = verified.connections.filter((c) => c.status === "pending");

    const users = await Promise.all(
      pending.map(async (c) => {
        const u = await User.findById(c.user);
        return {
          _id: u._id,
          name: u.name,
          phone: u.phone,
          location: u.location,
          address: u.address,
        };
      })
    );

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const verified = await VerifiedUser.findOne({ user: req.user._id });
    if (!verified) return res.status(404).json({ error: "Not verified" });

    const connection = verified.connections.find(
      (c) => c.user.toString() === req.params.userId
    );

    if (!connection)
      return res.status(404).json({ error: "Request not found" });

    connection.status = "accepted";
    await verified.save();

    res.json({ message: "Connection accepted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to accept request" });
  }
};
exports.getAcceptedProviders = async (req, res) => {
  try {
    const providers = await VerifiedUser.find({
      status: "approved",
      connections: {
        $elemMatch: {
          user: req.user._id,
          status: "accepted",
        },
      },
    }).populate("user", "name phone location address");

    res.json(providers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch providers" });
  }
};
