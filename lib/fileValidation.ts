export function validateFile(file: File, allowedTypes: string[], maxSize: number): { valid: boolean, error?: string } {
    if (file.size > maxSize) {
        return { valid: false, error: `File too large (max ${maxSize / (1024 * 1024)}MB)` };
    }
    
    const isValidType = allowedTypes.some(type => 
        file.type === type || file.name.toLowerCase().endsWith(type.split('/')[1])
    );
    
    if (!isValidType) {
        return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
    }
    
    return { valid: true };
}

export const FILE_TYPES = {
    CSV: ['text/csv', 'application/csv'],
    PYTHON: ['text/x-python', 'text/plain'],
    MARKDOWN: ['text/markdown', 'text/plain'],
    TEXT: ['text/plain']
};
