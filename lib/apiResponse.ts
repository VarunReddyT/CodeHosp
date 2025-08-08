import { NextResponse } from "next/server";

export function successResponse(data: any, message?: string) {
    return NextResponse.json({
        success: true,
        data,
        message,
        timestamp: new Date().toISOString()
    });
}

export function errorResponse(message: string, status: number = 500, details?: any) {
    return NextResponse.json({
        success: false,
        message,
        details,
        timestamp: new Date().toISOString()
    }, { status });
}
