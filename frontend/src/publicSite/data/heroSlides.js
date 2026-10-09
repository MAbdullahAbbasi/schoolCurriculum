/**
 * Unique hero carousel image sets per public page.
 * Each page uses a distinct set so visitors see different visuals.
 */

const img = (id, alt) => ({
  src: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1920&q=80`,
  alt,
});

export const HOME_HERO_SLIDES = [
  img('photo-1509062522246-3755977927d7', 'Teacher guiding students in a bright classroom'),
  img('photo-1503676260728-1c00da094a0b', 'Children learning together with books'),
  img('photo-1427504494785-3a9ca7044f45', 'Students collaborating on a learning activity'),
  img('photo-1497633762265-9d179a990aa6', 'Stack of educational books ready for study'),
];

export const ABOUT_HERO_SLIDES = [
  img('photo-1580582932707-520aed937b7b', 'Bright classroom ready for learning'),
  img('photo-1524178232363-1fb2b075b655', 'Educator presenting to a class'),
  img('photo-1522202176988-66273c2fd55f', 'Team collaborating around a table'),
  img('photo-1571260899304-425eee4c7efc', 'Students walking on a school campus'),
];

export const ACADEMICS_HERO_SLIDES = [
  img('photo-1587654780291-39c9404d746b', 'Young learners engaged in classroom activities'),
  img('photo-1503454537195-1dcabb73ffb9', 'Early learning classroom with colorful materials'),
  img('photo-1488190211105-8b0e65b80b4e', 'Student writing notes during a lesson'),
  img('photo-1523240795612-9e26bda65c69', 'Older students collaborating on schoolwork'),
];

export const FEATURES_HERO_SLIDES = [
  img('photo-1454165804606-c3d57bc86b40', 'Person reviewing documents and charts at a desk'),
  img('photo-1552664730-d307ca884978', 'Team planning with sticky notes on a board'),
  img('photo-1434030216411-0b793f4b4173', 'Student writing during an assessment'),
  img('photo-1460925895917-afdab827c52f', 'Workspace with analytics and planning materials'),
];

export const ARTICLES_HERO_SLIDES = [
  img('photo-1456513080080-369143f81f63', 'Open books and study materials on a desk'),
  img('photo-1481627834876-b7833e8f5570', 'Library shelves filled with books'),
  img('photo-1519682337058-a94d519337bc', 'Quiet reading space with open books'),
  img('photo-1471107340929-a87cd0f5b5f3', 'Notebook and pen ready for writing'),
];

export const ARTICLE_DETAIL_HERO_SLIDES = [
  img('photo-1524995997946-a1c2e315a42f', 'Stack of hardcover books on a wooden table'),
  img('photo-1512820790803-83ca734da794', 'Open book with soft natural light'),
  img('photo-1491841550277-8ea0c576a8c0', 'Person reading in a calm indoor setting'),
  img('photo-1507842217343-583bb7270b66', 'Large library reading room'),
];

export const CONTACT_HERO_SLIDES = [
  img('photo-1423666639041-f56000c27a9a', 'Hands typing on a laptop keyboard'),
  img('photo-1556761175-5973dc0f32e7', 'Professional conversation in a meeting room'),
  img('photo-1517245386807-bb43f82c33c4', 'People collaborating in a bright office'),
  img('photo-1516321318423-f06f85e504b3', 'Laptop and notebooks for communication and study'),
];
