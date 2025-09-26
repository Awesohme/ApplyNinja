// Simple health check endpoint
export default async function handler(req, res) {
    try {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const hasToken = !!process.env.HUGGINGFACE_TOKEN;

        return res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: {
                nodeVersion: process.version,
                hasHuggingFaceToken: hasToken,
                platform: process.platform
            }
        });
    } catch (error) {
        console.error('Health check error:', error);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}