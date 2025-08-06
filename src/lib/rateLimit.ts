const requests = new Map<string, { count: number, resetTime: number }>();

export function rateLimit(ip: string, maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
    const now = Date.now();
    const userRequests = requests.get(ip);
    
    if (!userRequests || now > userRequests.resetTime) {
        requests.set(ip, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1 };
    }
    
    if (userRequests.count >= maxRequests) {
        return { allowed: false, remaining: 0 };
    }
    
    userRequests.count++;
    return { allowed: true, remaining: maxRequests - userRequests.count };
}
