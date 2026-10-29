import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function PageMetadata({ title, description }) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title;

    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) {
      descriptionTag.setAttribute('content', description);
    }

    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.append(canonicalTag);
    }
    canonicalTag.setAttribute('href', `${window.location.origin}${pathname}`);
  }, [description, pathname, title]);

  return null;
}

export default PageMetadata;
