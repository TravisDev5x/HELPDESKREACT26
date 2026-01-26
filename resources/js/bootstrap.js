import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// --- ESTA ES LA LÍNEA QUE TE FALTA ---
// Le dice a Axios: "Acepta las cookies que envía Laravel y devuélvelas en cada petición"
window.axios.defaults.withCredentials = true;