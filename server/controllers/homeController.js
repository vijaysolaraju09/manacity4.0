// Dummy static data for now — you’ll later fetch from DB
exports.getBanner = async (req, res) => {
  res.json({
    image: "https://via.placeholder.com/600x200.png?text=Admin+Banner",
    text: "Big Sale this weekend!",
    link: "/special-shop",
  });
};

exports.getOffers = async (req, res) => {
  res.json([
    {
      _id: "1",
      name: "Discounted Rice",
      image: "https://via.placeholder.com/150",
      description: "50% off on rice bags",
    },
    {
      _id: "2",
      name: "Fresh Veggies",
      image: "https://via.placeholder.com/150",
      description: "Local organic vegetables",
    },
  ]);
};

exports.getVerifiedUsers = async (req, res) => {
  res.json([
    { _id: "1", name: "Raju", profession: "Electrician" },
    { _id: "2", name: "Priya", profession: "Tutor" },
  ]);
};

exports.getEvents = async (req, res) => {
  res.json([
    {
      _id: "1",
      name: "Cricket Tournament",
      date: "2025-06-01",
      time: "4:00 PM",
    },
    {
      _id: "2",
      name: "Job Fair",
      date: "2025-06-05",
      time: "10:00 AM",
    },
  ]);
};

exports.getSpecialProducts = async (req, res) => {
  res.json([
    {
      _id: "sp1",
      name: "Admin Combo Pack",
      image: "https://via.placeholder.com/150",
      description: "Special limited edition pack",
    },
  ]);
};
