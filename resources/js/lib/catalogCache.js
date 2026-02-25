import axios from "@/lib/axios";

const CACHE_KEY = "catalogs.cache.v2";
const TTL_MS = 15 * 60 * 1000; // 15 minutos: menos peticiones a /api/catalogs

function getCached() {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed?.ts || !parsed?.data) return null;
        const isValid = Date.now() - parsed.ts < TTL_MS;
        return isValid ? parsed.data : null;
    } catch (_) {
        return null;
    }
}

function setCached(data) {
    if (typeof sessionStorage === "undefined") return;
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch (_) {}
}

export async function loadCatalogs() {
    const cached = getCached();
    if (cached) return cached;

    const { data } = await axios.get("/api/catalogs");
    setCached(data);
    return data;
}

export function clearCatalogCache() {
    if (typeof sessionStorage === "undefined") return;
    try {
        sessionStorage.removeItem(CACHE_KEY);
    } catch (_) {}
}
