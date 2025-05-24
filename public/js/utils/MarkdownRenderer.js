export class MarkdownRenderer {
    constructor() {
        this.initializeMarkdown();
    }

    initializeMarkdown() {
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true,
                pedantic: false,
                sanitize: false,
                highlight: null
            });
        }
    }

    render(content) {
        if (typeof marked !== 'undefined') {
            try {
                const html = marked.parse(content);
                if (typeof DOMPurify !== 'undefined') {
                    return DOMPurify.sanitize(html, {
                        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'],
                        ALLOWED_ATTR: ['href', 'title', 'class']
                    });
                }
                return html;
            } catch (error) {
                return this.fallbackRender(content);
            }
        }
        return this.fallbackRender(content);
    }

    fallbackRender(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }
}
