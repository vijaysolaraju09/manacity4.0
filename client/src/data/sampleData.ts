export const sampleShops = [
  {
    _id: 'shop1',
    name: 'Café Aroma',
    category: 'Restaurant',
    location: 'Town Center',

    address: '123 Main St, Town Center',
    isOpen: true,
    image: 'https://source.unsplash.com/400x300/?cafe,coffee',
    banner: 'https://source.unsplash.com/600x250/?coffee,shop',
    description: 'Cozy place for freshly brewed coffee and snacks.',
    contact: '1234567890',
    rating: 4.5,
    products: [
      {
        _id: 'p1',
        name: 'Espresso',
        price: 50,
        image: 'https://source.unsplash.com/200x150/?espresso',
      },
      {
        _id: 'p2',
        name: 'Cappuccino',
        price: 70,
        image: 'https://source.unsplash.com/200x150/?cappuccino',
      },
    ],

  },
  {
    _id: 'shop2',
    name: 'Mechanix Garage',
    category: 'Mechanic',
    location: 'West End',
    address: '45 Industrial Rd, West End',
    isOpen: false,
    image: 'https://source.unsplash.com/400x300/?garage,mechanic',
    products: [
      {
        _id: 'p3',
        name: 'Oil Change',
        price: 299,
        image: 'https://source.unsplash.com/200x150/?engine',
      },
      {
        _id: 'p4',
        name: 'Brake Service',
        price: 499,
        image: 'https://source.unsplash.com/200x150/?brake',
      },
    ],
  },
  {
    _id: 'shop3',
    name: 'Style Hub',
    category: 'Fashion',
    location: 'East Side',
    address: '78 Fashion Ave, East Side',
    isOpen: true,
    image: 'https://source.unsplash.com/400x300/?fashion,store',
    products: [
      {
        _id: 'p5',
        name: 'T-Shirt',
        price: 399,
        image: 'https://source.unsplash.com/200x150/?tshirt',
      },
      {
        _id: 'p6',
        name: 'Jeans',
        price: 799,
        image: 'https://source.unsplash.com/200x150/?jeans',
      },
    ],
  },
  {
    _id: 'shop4',
    name: 'Green Grocery',
    category: 'Grocery',
    location: 'North Market',
    address: '12 Market St, North Market',
    isOpen: true,
    image: 'https://source.unsplash.com/400x300/?grocery,shop',
    products: [
      {
        _id: 'p7',
        name: 'Fresh Apples',
        price: 99,
        image: 'https://source.unsplash.com/200x150/?apples',
      },
      {
        _id: 'p8',
        name: 'Organic Milk',
        price: 65,
        image: 'https://source.unsplash.com/200x150/?milk',
      },
    ],
  },
];

export const sampleProduct = {
  _id: 'prod1',
  name: 'Sample Product',
  image: 'https://source.unsplash.com/600x300/?product',
  price: 999,
  description: 'This is a placeholder product description.',
  category: 'General',
  shopName: 'Star Electronics',
  discount: 10,
};

export const sampleVerifiedUser = {
  _id: 'user1',
  name: 'Jane Doe',
  profession: 'Electrician',
  bio: 'Experienced electrician providing quality services.',
  location: 'Town Center',
  contact: '1234567890',
  avatar: 'https://source.unsplash.com/300x200/?portrait',
  rating: 4,
};

export const sampleEvent = {
  _id: 'event1',
  name: 'Community Cricket Match',
  category: 'Sports',
  location: 'City Stadium',
  startDate: '2025-08-01T18:00:00Z',
  description: 'Join us for an exciting community cricket event!',
  adminNote: 'Registration closes a week before the event.',
  image: 'https://source.unsplash.com/600x300/?cricket',
};
