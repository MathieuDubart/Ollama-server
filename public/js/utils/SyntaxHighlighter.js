export class SyntaxHighlighter {
    applyHighlighting(element) {
        if (typeof Prism === 'undefined') return;

        const codeBlocks = element.querySelectorAll('pre code');
        codeBlocks.forEach(this.highlightCodeBlock.bind(this));
    }

    highlightCodeBlock(codeElement) {
        try {
            const text = codeElement.textContent;
            if (!text || text.trim().length === 0) return;
            
            const language = this.detectLanguage(text);
            
            if (Prism.languages[language]) {
                codeElement.className = `language-${language}`;
                codeElement.parentElement.className = `language-${language}`;
                
                try {
                    const highlighted = Prism.highlight(text, Prism.languages[language], language);
                    codeElement.innerHTML = highlighted;
                } catch (prismError) {
                    this.setAsPlainText(codeElement, text);
                }
            } else {
                this.setAsPlainText(codeElement, text);
            }
        } catch (error) {
            // Silent fail
        }
    }

    setAsPlainText(codeElement, text) {
        codeElement.textContent = text;
        codeElement.className = 'language-text';
        codeElement.parentElement.className = 'language-text';
    }

    detectLanguage(text) {
        const code = text.toLowerCase().trim();
        
        if (code.includes('function') || code.includes('const ') || code.includes('let ') || 
            code.includes('=>') || code.includes('console.log') || code.includes('document.')) {
            return 'javascript';
        }
        
        if (code.includes('def ') || code.includes('import ') || code.includes('print(') ||
            code.includes('if __name__') || code.includes('elif ')) {
            return 'python';
        }
        
        if (code.includes('<?php') || (code.includes('$') && code.includes('->')) ||
            code.includes('echo ') || code.includes('function ') && code.includes('$')) {
            return 'php';
        }
        
        if (code.includes('select ') || code.includes('from ') || code.includes('where ') ||
            code.includes('insert ') || code.includes('update ') || code.includes('delete ')) {
            return 'sql';
        }
        
        if ((code.startsWith('{') && code.endsWith('}')) || 
            (code.startsWith('[') && code.endsWith(']'))) {
            try {
                JSON.parse(text);
                return 'json';
            } catch (e) {
                // Not valid JSON
            }
        }
        
        if (code.includes('{') && code.includes(':') && code.includes(';') && 
            (code.includes('color') || code.includes('margin') || code.includes('padding'))) {
            return 'css';
        }
        
        if (code.includes('<html') || code.includes('<!doctype') || 
            (code.includes('<') && code.includes('>') && code.includes('</'))) {
            return 'markup';
        }
        
        return 'text';
    }
}