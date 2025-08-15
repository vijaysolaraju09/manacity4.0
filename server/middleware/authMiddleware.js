const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userId) {
      req.user = await User.findById(decoded.userId).select("-password");
      if (!req.user)
        return res.status(401).json({ error: "Invalid token user" });
      req.user.userId = decoded.userId;
      req.user.role = decoded.role;
    } else {
      req.user = { role: decoded.role };
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = protect;
