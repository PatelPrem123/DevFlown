import { useEffect } from 'react';

/**
 * Custom Hook for Dynamic Search Engine Optimization (SEO) & Open Graph Tag Management
 * Updates document.title, description meta tag, canonical link, and social graph on route changes.
 */
export function useSEO({
  title = 'DevFlow — Developer Project Management & Real-Time Agile Collaboration',
  description = 'DevFlow is the ultra-fast developer project management and agile team collaboration platform featuring Lexorank fractional indexing Kanban, real-time Socket.IO synchronization, sprint automation, and GitHub integration.',
  keywords = 'developer project management, agile collaboration, kanban board, sprint planning, lexorank, github integration, devops',
  canonicalUrl = window.location.href,
  ogType = 'website',
  ogImage = 'https://devflow.io/og-image.png'
} = {}) {
  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // 2. Helper to set or create meta tags
    const updateMeta = (nameAttr, nameValue, content) => {
      let element = document.querySelector(`meta[${nameAttr}="${nameValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, nameValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Update Standard Meta Tags
    updateMeta('name', 'title', title);
    updateMeta('name', 'description', description);
    updateMeta('name', 'keywords', keywords);

    // 4. Update Open Graph Meta Tags
    updateMeta('property', 'og:title', title);
    updateMeta('property', 'og:description', description);
    updateMeta('property', 'og:url', canonicalUrl);
    updateMeta('property', 'og:type', ogType);
    updateMeta('property', 'og:image', ogImage);

    // 5. Update Twitter Card Meta Tags
    updateMeta('name', 'twitter:title', title);
    updateMeta('name', 'twitter:description', description);
    updateMeta('name', 'twitter:image', ogImage);

    // 6. Update Canonical Link
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', canonicalUrl);
  }, [title, description, keywords, canonicalUrl, ogType, ogImage]);
}

export default useSEO;
