export const SITE_URL = 'https://elmivet.com';

export const DEFAULT_SEO = {
  title: 'Elmivet International Limited | Global Trade, Logistics & Industrial Solutions',
  description: 'Elmivet International Limited delivers integrated global trade, logistics, supply chain and industrial solutions, connecting businesses and markets worldwide.',
};

export const PAGE_SEO = {
  home: {
    title: DEFAULT_SEO.title,
    description: DEFAULT_SEO.description,
    path: '/',
  },
  about: {
    title: 'About Us | Elmivet International Limited',
    description: 'Discover Elmivet International Limited, our business, expertise and commitment to delivering integrated international trade and logistics solutions.',
    path: '/about',
  },
  services: {
    title: 'Our Services | Elmivet International Limited',
    description: 'Explore Elmivet International Limited services across global trade, logistics, supply chain, commercial and industrial operations.',
    path: '/services',
  },
  globalInsight: {
    title: 'Global Insights | Elmivet International Limited',
    description: 'Explore industry updates, regulatory developments and insights on global trade, logistics and international business.',
    path: '/global-insight',
  },
  contact: {
    title: 'Contact Us | Elmivet International Limited',
    description: 'Contact Elmivet International Limited to discuss your international trade, logistics, supply chain and industrial service requirements.',
    path: '/contact',
  },
};

export function getCanonicalUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}