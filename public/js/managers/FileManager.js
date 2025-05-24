export class FileManager {
    constructor() {
        this.selectedFiles = [];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
    }

    async handleFileSelection(files) {
        for (const file of files) {
            await this.addFile(file);
        }
        return [...this.selectedFiles];
    }

    async addFile(file) {
        if (file.size > this.maxFileSize) {
            throw new Error(`File too large (max ${this.formatFileSize(this.maxFileSize)})`);
        }
        
        const content = await this.readFileContent(file);
        this.selectedFiles.push({
            filename: `${Date.now()}-${file.name}`,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'text/plain',
            content: content
        });
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
    }

    clearFiles() {
        this.selectedFiles = [];
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}