const state = {
  users: {},
};

function setUsers(users) {
  state.users = { ...users };
}

function getUser(token) {
  if (!token) return null;
  return state.users[token] || null;
}

module.exports = {
  setUsers,
  getUser,
};
