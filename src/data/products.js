// Default products. Admin panel edits are persisted to localStorage
// (see StoreContext) — this array only seeds a fresh install.
const products = [
  {
    id: 'p-create-reality',
    name: 'Create Reality',
    categoryId: 'cat-graphic',
    price: 899,
    discount: 22,
    images: [
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&q=80',
      'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80'
    ],
    colors: ['Black'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 42,
    rating: 4.6,
    reviews: 128,
    tags: ['new', 'bestseller'],
    description: 'Heavyweight 240 GSM cotton tee with a distressed portrait print. Oversized, boxy fit.'
  },
  {
    id: 'p-express',
    name: 'Express',
    categoryId: 'cat-graphic',
    price: 799,
    discount: 12,
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80'
    ],
    colors: ['White', 'Black'],
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 31,
    rating: 4.4,
    reviews: 76,
    tags: ['new'],
    description: '"Express, not to impress" — glitch-art bust print with barcode tag graphic.'
  },
  {
    id: 'p-chaos',
    name: 'Chaos',
    categoryId: 'cat-oversized',
    price: 849,
    discount: 0,
    images: [
      'https://images.unsplash.com/photo-1554568218-0f1715e72254?w=800&q=80',
      'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=800&q=80'
    ],
    colors: ['Black'],
    sizes: ['M', 'L', 'XL', 'XXL'],
    stock: 18,
    rating: 4.7,
    reviews: 54,
    tags: ['bestseller'],
    description: 'Drip-smile graphic, "Find Your Fire" back print. Drop-shoulder oversized cut.'
  },
  {
    id: 'p-imagine',
    name: 'Imagine',
    categoryId: 'cat-anime',
    price: 799,
    discount: 15,
    images: [
      'https://images.unsplash.com/photo-1622445275576-721325763afe?w=800&q=80',
      'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=800&q=80'
    ],
    colors: ['White'],
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 25,
    rating: 4.5,
    reviews: 41,
    tags: ['new'],
    description: 'Manga-panel collage print on premium combed cotton.'
  },
  {
    id: 'p-static',
    name: 'Static Mind',
    categoryId: 'cat-anime',
    price: 899,
    discount: 10,
    images: [
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80'
    ],
    colors: ['Black'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 12,
    rating: 4.3,
    reviews: 19,
    tags: [],
    description: 'Fragmented character print, distressed wash finish.'
  },
  {
    id: 'p-nightshade',
    name: 'Nightshade Hoodie',
    categoryId: 'cat-hoodies',
    price: 1799,
    discount: 18,
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80',
      'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=800&q=80'
    ],
    colors: ['Black', 'Grey'],
    sizes: ['M', 'L', 'XL', 'XXL'],
    stock: 20,
    rating: 4.8,
    reviews: 63,
    tags: ['bestseller'],
    description: '380 GSM fleece hoodie, kangaroo pocket, ribbed cuffs.'
  },
  {
    id: 'p-blackout',
    name: 'Blackout Hoodie',
    categoryId: 'cat-hoodies',
    price: 1899,
    discount: 0,
    images: [
      'https://images.unsplash.com/photo-1509942774463-acf339cf87d5?w=800&q=80',
      'https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=800&q=80'
    ],
    colors: ['Black'],
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 15,
    rating: 4.6,
    reviews: 22,
    tags: ['new'],
    description: 'All-black hoodie, tonal chest embroidery, brushed interior.'
  },
  {
    id: 'p-canvas-basic',
    name: 'Canvas Basic Tee',
    categoryId: 'cat-minimal',
    price: 599,
    discount: 0,
    images: [
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80'
    ],
    colors: ['White', 'Black', 'Grey'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 60,
    rating: 4.2,
    reviews: 90,
    tags: [],
    description: 'Blank canvas tee — the recommended base for Design Your Own.'
  }
]

export default products
