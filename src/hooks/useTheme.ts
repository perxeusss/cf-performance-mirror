import { useEffect, useState } from 'react';
import { createTheme, type Theme } from '../domain/theme';

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => createTheme());

  useEffect(() => {
    let previous = theme;

    const update = () => {
      const next = createTheme();
      if (
        next.isDark !== previous.isDark ||
        next.bg !== previous.bg ||
        next.border !== previous.border ||
        next.borderLight !== previous.borderLight
      ) {
        previous = next;
        setTheme(next);
      }
    };

    const observer = new MutationObserver(update);
    const observe = (element: Element | null) => {
      if (element) observer.observe(element, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    };

    observe(document.documentElement);
    observe(document.body);
    for (const selector of ['.info', '.roundbox', '#pageContent']) {
      observe(document.querySelector(selector));
    }

    const interval = window.setInterval(update, 500);
    window.addEventListener('focus', update);
    window.setTimeout(update, 100);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      window.removeEventListener('focus', update);
    };
  }, []);

  return theme;
}
