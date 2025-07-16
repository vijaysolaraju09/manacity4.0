exports.getProfile = async (req, res) => {
  res.status(200).json({ user: req.user });
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, location, address } = req.body;

    if (name) req.user.name = name;
    if (location) req.user.location = location;
    if (address !== undefined) req.user.address = address;

    const updatedUser = await req.user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        location: updatedUser.location,
        address: updatedUser.address,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
};
