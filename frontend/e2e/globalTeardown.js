import { stopStack } from './stack.js';

export default async () => {
    console.log('\n[e2e] tearing down stack...');
    stopStack();
};
