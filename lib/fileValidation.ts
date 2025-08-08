export function validateFile(file: File, allowedTypes: string[], maxSize: number): { valid: boolean, error?: string } {
    if (file.size > maxSize) {
        return { valid: false, error: `File too large (max ${maxSize / (1024 * 1024)}MB)` };
    }
    
    const isValidType = allowedTypes.some(type => 
        file.type === type || file.name.toLowerCase().endsWith(type.split('/')[1])
    );
    console.log(file.type, allowedTypes, isValidType);
    if (!isValidType) {
        return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
    }
    
    return { valid: true };
}

export const FILE_TYPES = {
    SPREADSHEET: [
        'text/csv', 
        'application/csv',
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
        'application/vnd.ms-excel.template.macroEnabled.12', // .xltm
        'application/vnd.ms-excel.addin.macroEnabled.12', // .xlam
        'application/vnd.ms-excel.sheet.binary.macroEnabled.12' // .xlsb
    ],
    PYTHON: ['text/x-python', 'text/plain'],
    MARKDOWN: ['text/markdown', 'text/plain'],
    TEXT: ['text/plain']
};
