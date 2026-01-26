import axios from "axios";

// Cliente separado sin interceptores para obtener el token CSRF
const csrfClient = axios.create({ withCredentials: true });
let csrfPromise = null;

const ensureCsrf = () => {
    if (!csrfPromise) {
        csrfPromise = csrfClient.get("/sanctum/csrf-cookie").catch((err) => {
            csrfPromise = null; // reintentar en el siguiente intento
            throw err;
        });
    }
    return csrfPromise;
};

const instance = axios.create({
    baseURL: "/",
    withCredentials: true,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
    headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
    },
});

instance.interceptors.request.use(async (config) => {
    const method = (config.method || "get").toLowerCase();
    if (!["get", "head", "options", "trace"].includes(method)) {
        await ensureCsrf();
    }
    return config;
});

instance.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 419) {
            window.dispatchEvent(new CustomEvent("navigate-to-login"));
        }
        return Promise.reject(error);
    }
);

export default instance;
