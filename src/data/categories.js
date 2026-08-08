// Default categories. Once the admin edits categories in the panel,
// the edited list is persisted to localStorage and this file is only
// used as the initial seed / fallback.
const categories = [
  {
    id: 'cat-oversized',
    name: 'Oversized Tees',
    slug: 'oversized-tees',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
    description: 'Drop-shoulder, boxy fit, built for layering.'
  },
  {
    id: 'cat-graphic',
    name: 'Graphic Prints',
    slug: 'graphic-prints',
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&q=80',
    description: 'Statement art, one print run at a time.'
  },
  {
    id: 'cat-anime',
    name: 'Anime Series',
    slug: 'anime-series',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80',
    description: 'Panel-inspired drops for the fans.'
  },
  {
    id: 'cat-hoodies',
    name: 'Hoodies',
    slug: 'hoodies',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80',
    description: 'Heavyweight fleece, made for the cold drops.'
  },
  {
    id: 'cat-minimal',
    name: 'Minimal Basics',
    slug: 'minimal-basics',
    image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&q=80',
    description: 'Clean canvases — perfect for Design Your Own.'
  }
]

export default categories
