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
            if (url) {
                // Ping the external Render URL
                https.get(url, (res) => {
                    if (res.statusCode === 200) {
                        console.log(`[Keep-Alive] Successfully pinged external URL: ${url}`);
                    } else {
                        console.log(`[Keep-Alive] External URL returned status: ${res.statusCode}`);
                    }
                }).on('error', (err) => {
                    console.error(`[Keep-Alive] Error pinging external URL: ${err.message}`);
                });
            } else {
                // Fallback: ping localhost
                http.get(`http://localhost:${port}`, (res) => {
                    if (res.statusCode === 200) {
                        console.log(`[Keep-Alive] Successfully pinged localhost on port ${port}`);
                    }
                }).on('error', (err) => {
                    console.error(`[Keep-Alive] Error pinging localhost: ${err.message}`);
                });
            }
        } catch (error) {
            console.error('[Keep-Alive] Exception during ping:', error.message);
        }
    }, PING_INTERVAL);

    console.log(`[Keep-Alive] Started. Will ping every 14 minutes.`);
}

module.exports = startKeepAlive;
