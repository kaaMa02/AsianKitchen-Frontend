import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const id = decodeURIComponent(hash.replace('#', ''));
    let attempts = 0;

    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        // respects CSS scroll-margin-top on your sections
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (attempts < 10) {
        attempts += 1;
        setTimeout(tryScroll, 50); // wait for content to mount
      }
    };

    // kick off after paint
    requestAnimationFrame(tryScroll);
  }, [pathname, hash]);

  return null;
}
