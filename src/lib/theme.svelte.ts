export type ThemeMode = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'tm.theme';

function createThemeStore() {
  let mode = $state<ThemeMode>('auto');

  function applyToRoot() {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    if (mode === 'light') root.classList.add('theme-light');
    if (mode === 'dark') root.classList.add('theme-dark');
  }

  function load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        mode = stored;
        applyToRoot();
      }
    } catch {
      /* localStorage unavailable; stick with 'auto' */
    }
  }

  function set(next: ThemeMode) {
    mode = next;
    applyToRoot();
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function cycle() {
    const order: ThemeMode[] = ['auto', 'light', 'dark'];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    set(next);
  }

  return {
    get mode() {
      return mode;
    },
    load,
    set,
    cycle
  };
}

export type ThemeStore = ReturnType<typeof createThemeStore>;

export const themeStore = createThemeStore();
