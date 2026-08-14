import { startStack } from './stack.js';

export default async () => {
    console.log('\n[e2e] starting isolated stack (mongod + backend + vite)...');
    const state = await startStack();
    process.env.E2E_BASE_URL = state.baseUrl;
    process.env.E2E_API_URL = state.apiUrl;
    console.log(`[e2e] web: ${state.baseUrl}`);
    console.log(`[e2e] api: ${state.apiUrl}`);
};
