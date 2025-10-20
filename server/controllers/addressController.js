const {
  listAddressResponses,
  createOrUpdateAddress,
  toAddressResponse,
} = require('../services/addressBookService');

exports.listAddresses = async (req, res, next) => {
  try {
    const items = await listAddressResponses(req.user._id);
    res.json({ ok: true, data: { items }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.createAddress = async (req, res, next) => {
  try {
    const address = await createOrUpdateAddress(req.user._id, req.body || {});
    res.status(201).json({ ok: true, data: { address: toAddressResponse(address) }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};
