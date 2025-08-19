exports.normalizeProduct = (p) => ({
  id: p._id.toString(),
  _id: p._id.toString(),
  name: p.name,
  price: p.price,
  mrp: p.mrp,
  discount: p.mrp ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0,
  stock: p.stock,
  images: p.images,
  image: p.images?.[0] || '',
  category: p.category,
  shopId: p.shop?._id ? p.shop._id.toString() : p.shop.toString(),
  shop: p.shop?._id ? p.shop._id.toString() : p.shop.toString(),
  rating: p.rating || 0,
  shopMeta:
    p.shop && p.shop.name
      ? {
          id: p.shop._id.toString(),
          name: p.shop.name,
          image: p.shop.image,
          location: p.shop.location,
        }
      : undefined,
});
