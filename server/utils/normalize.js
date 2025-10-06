const toPaise = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.round(value * 100);
};

exports.normalizeProduct = (p) => {
  const price = typeof p.price === 'number' ? p.price : 0;
  const mrp = typeof p.mrp === 'number' ? p.mrp : 0;
  const discount = mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const shopId =
    p.shop && typeof p.shop === 'object' && p.shop._id ? p.shop._id.toString() : p.shop?.toString();

  return {
    id: p._id.toString(),
    _id: p._id.toString(),
    name: p.name,
    description: p.description || '',
    price,
    pricePaise: toPaise(price),
    mrp,
    mrpPaise: toPaise(mrp),
    discount,
    stock: p.stock,
    images: p.images,
    image: p.images?.[0] || p.image || '',
    category: p.category,
    shopId: shopId,
    shop: shopId,
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
  };
};
