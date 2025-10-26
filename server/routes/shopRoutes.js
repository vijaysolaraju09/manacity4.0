const r = require('express').Router();
const ctrl = require('../controllers/shopsController');
const auth = require('../middleware/auth');

r.get('/', ctrl.getAllShops);
r.get('/my', auth, ctrl.getMyShops);
r.get('/:id', ctrl.getShopById);
r.get('/:id/products', ctrl.getProductsByShop);
r.patch('/:shopId/products/:productId', auth, ctrl.updateShopProduct);
r.post('/', auth, ctrl.createShop);
r.patch('/:id', auth, ctrl.updateShop);
r.delete('/:id', auth, ctrl.deleteShop);

module.exports = r;
