const https = require('https');
const http = require('http');

/**
 * Pings the provided URL every 14 minutes to prevent Render.com free tier from sleeping.
 * If no URL is provided, it attempts to ping localhost on the given port.
 * 
 * @param {string} url - The external URL of the application (e.g., https://my-bot.onrender.com)
 * @param {number} port - The local port the server is running on (fallback)
 */
function startKeepAlive(url, port = 3000) {
    const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes

    setInterval(() => {
        try {
            const targetUrl = url || `http://localhost:${port}`;
            const req = targetUrl.startsWith('https') ? https : http;

            req.get(targetUrl, (res) => {
                if (res.statusCode === 200) {
                    console.log(`[Keep-Alive] Successfully pinged: ${targetUrl}`);
                } else {
                    console.log(`[Keep-Alive] Ping returned status: ${res.statusCode}`);
                }
            }).on('error', (err) => {
                console.error(`[Keep-Alive] Error pinging ${targetUrl}: ${err.message}`);
            });
        } catch (error) {
            console.error('[Keep-Alive] Exception during ping:', error.message);
        }
    }, PING_INTERVAL);

    console.log(`[Keep-Alive] Started. Will ping every 14 minutes.`);
}

module.exports = startKeepAlive;
