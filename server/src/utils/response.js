const success = (message = 'Success', data = null, extras = {}) => ({
  ok: true,
  msg: message,
  ...(data !== null ? { data } : {}),
  ...extras,
});

const fail = (message = 'Error', errors = null, extras = {}) => ({
  ok: false,
  msg: message,
  ...(errors !== null ? { errors } : {}),
  ...extras,
});

module.exports = {
  success,
  fail,
};
