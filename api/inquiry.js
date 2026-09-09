import { handleInquiry } from '../lib/inquiry.js';
export default { fetch(request) { return handleInquiry(request, process.env); } };
