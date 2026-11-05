import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Dual-Layer Content Sanitizer (DEC-011)
 * Cleans user-generated Markdown and HTML descriptions before database persistence
 */
export const sanitizeHtml = (dirtyContent) => {
  if (!dirtyContent || typeof dirtyContent !== 'string') return '';

  return DOMPurify.sanitize(dirtyContent, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'code',
      'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'br', 'hr', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false
  });
};
