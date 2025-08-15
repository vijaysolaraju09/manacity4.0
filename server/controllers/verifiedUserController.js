const VerifiedUser = require("../models/VerifiedUser");
const User = require("../models/User");

exports.applyForVerification = async (req, res) => {
  try {
    const { profession, bio, portfolio = [] } = req.body;
    const userId = req.user._id;

    let request = await VerifiedUser.findOne({ user: userId });
    if (request && request.status === "pending")
      return res.status(400).json({ error: "Already applied" });

    if (request) {
      request.profession = profession;
      request.bio = bio;
      request.portfolio = portfolio;
      request.status = "pending";
      await request.save();
    } else {
      request = await VerifiedUser.create({
        user: userId,
        profession,
        bio,
        portfolio,
      });
    }

    const user = await User.findById(userId);
    if (user) {
      user.profession = profession;
      user.bio = bio;
      user.isVerified = false;
      user.verificationStatus = "pending";
      await user.save();
    }

    res.status(201).json({ message: "Request submitted" });
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

exports.getVerificationRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      profession,
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (profession)
      query.profession = { $regex: new RegExp(profession, "i") };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await VerifiedUser.countDocuments(query);

    const requests = await VerifiedUser.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("user", "name phone");

    res.json({
      requests,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
};

exports.acceptVerificationRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const request = await VerifiedUser.findOne({ user: userId, status: "pending" });
    if (!request) return res.status(404).json({ error: "Request not found" });

    request.status = "approved";
    await request.save();

    const user = await User.findById(userId);
    if (user) {
      user.isVerified = true;
      user.verificationStatus = "verified";
      user.profession = request.profession;
      user.bio = request.bio;
      await user.save();
    }

    res.json({ message: "User verified" });
  } catch (err) {
    res.status(500).json({ error: "Failed to accept request" });
  }
};

exports.rejectVerificationRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const request = await VerifiedUser.findOne({ user: userId, status: "pending" });
    if (!request) return res.status(404).json({ error: "Request not found" });

    request.status = "rejected";
    await request.save();

    const user = await User.findById(userId);
    if (user) {
      user.verificationStatus = "rejected";
      await user.save();
    }

    res.json({ message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject request" });
  }
};
