export function handleApiError(error: unknown) {
    console.error("API Error:", error);
    
    if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('auth')) {
            return { status: 401, message: "Authentication required" };
        }
        if (error.message.includes('permission')) {
            return { status: 403, message: "Permission denied" };
        }
        if (error.message.includes('not found')) {
            return { status: 404, message: "Resource not found" };
        }
        
        return { status: 500, message: error.message };
    }
    
    return { status: 500, message: "Internal server error" };
}
