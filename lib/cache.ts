const cache = new Map<string, { data: any, timestamp: number, ttl: number }>();

export function setCache(key: string, data: any, ttlMinutes: number = 5) {
    cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes * 60 * 1000
    });
}

export function getCache(key: string) {
    const cached = cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
        cache.delete(key);
        return null;
    }
    
    return cached.data;
}

export function clearCache(pattern?: string) {
    if (pattern) {
        for (const key of cache.keys()) {
            if (key.includes(pattern)) {
                cache.delete(key);
            }
        }
    } else {
        cache.clear();
    }
}
