export class ThemeManager {
    constructor() {
        this.storageKey = 'ollama-theme';
        this.currentTheme = 'dark-theme';
    }

    load() {
        const savedTheme = localStorage.getItem(this.storageKey) || 'dark-theme';
        this.setTheme(savedTheme);
    }

    toggle() {
        const newTheme = this.currentTheme === 'dark-theme' ? 'light-theme' : 'dark-theme';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.body.className = theme;
        this.currentTheme = theme;
        localStorage.setItem(this.storageKey, theme);
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark-theme' ? '☀️' : '🌙';
        }
    }
}
