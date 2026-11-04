export interface City {
  name: string;
  slug: string;
  count: string;
  kicker: string;
  landmark: string;
  description: string;
  imagePublicId: string;
  imageUrl: string;
}

export const cities: City[] = [
  {
    name: 'Islamabad',
    slug: 'islamabad',
    count: '1,420+',
    kicker: 'National Architectural Icon',
    landmark: 'Shah Faisal Mosque',
    description:
      'Iconic triangular modern Islamic architecture nestled beneath the scenic Margalla Hills.',
    imagePublicId: 'highrise/cities/islamabad',
    imageUrl: '/images/cities/islamabad.jpg',
  },
  {
    name: 'Lahore',
    slug: 'lahore',
    count: '2,850+',
    kicker: 'Mughal Architectural Masterpiece',
    landmark: 'Badshahi Mosque & Minar-e-Pakistan',
    description:
      'Centuries of grand Mughal red sandstone architecture, cultural boulevards, and premium developments.',
    imagePublicId: 'highrise/cities/lahore',
    imageUrl: '/images/cities/lahore.jpg',
  },
  {
    name: 'Karachi',
    slug: 'karachi',
    count: '3,100+',
    kicker: 'National Mausoleum & Monument',
    landmark: "Mazar-e-Quaid (Founder's Shrine)",
    description:
      "Pakistan's coastal metropolis featuring Quaid's white marble shrine, Clifton towers, and seaside commerce.",
    imagePublicId: 'highrise/cities/karachi',
    imageUrl: '/images/cities/karachi.jpg',
  },
  {
    name: 'Rawalpindi',
    slug: 'rawalpindi',
    count: '940+',
    kicker: '15th-Century Gakhar Fortification',
    landmark: 'Rawalpindi Fort Archaeological Citadel',
    description:
      'Ancient stone fortifications of the Grand Trunk Road, bustling bazaars, and modern gated communities.',
    imagePublicId: 'highrise/cities/rawalpindi',
    imageUrl: '/images/cities/rawalpindi.jpg',
  },
  {
    name: 'Peshawar',
    slug: 'peshawar',
    count: '620+',
    kicker: 'Historic Gateway & Khyber Pass',
    landmark: 'Bab-e-Khyber & Bala Hissar Fort',
    description:
      'Legendary stone gateway into the historic Khyber Pass steeped in centuries of frontier heritage.',
    imagePublicId: 'highrise/cities/peshawar',
    imageUrl: '/images/cities/peshawar.jpg',
  },
  {
    name: 'Faisalabad',
    slug: 'faisalabad',
    count: '510+',
    kicker: 'Victorian 1903 Eight-Bazaar Landmark',
    landmark: 'Ghanta Char (Historic Clock Tower)',
    description:
      'Vibrant industrial center planned around the historic 1903 Victorian red brick clock tower.',
    imagePublicId: 'highrise/cities/faisalabad',
    imageUrl: '/images/cities/faisalabad.jpg',
  },
  {
    name: 'Multan',
    slug: 'multan',
    count: '780+',
    kicker: '14th-Century Blue Glazed Tilework',
    landmark: 'Shrine of Shah Rukn-e-Alam',
    description:
      'Majestic octagonal Sufi shrine celebrated for intricate blue tilework and massive domes.',
    imagePublicId: 'highrise/cities/multan',
    imageUrl: '/images/cities/multan.jpg',
  },
]