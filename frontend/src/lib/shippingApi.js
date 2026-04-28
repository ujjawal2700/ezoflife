import { BASE_URL } from './api';

export const shippingConfigApi = {
    getConfig: async () => {
        try {
            const response = await fetch(`${BASE_URL}/admin/config`);
            return await response.json();
        } catch (error) {
            console.error('Get Config Error:', error);
            throw error;
        }
    },
    updateConfig: async (key, value) => {
        try {
            const response = await fetch(`${BASE_URL}/admin/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return await response.json();
            } else {
                const text = await response.text();
                console.error("Non-JSON response from server:", text.substring(0, 200));
                throw new Error("Server returned non-JSON response (likely 404 HTML). Please restart backend.");
            }
        } catch (error) {
            console.error('Update Config Error:', error);
            throw error;
        }
    }
};
