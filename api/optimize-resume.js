// Vercel serverless function for resume optimization
export default async function handler(req, res) {
    // Enable CORS for Chrome extension
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { masterResume, jobDescription, communicationStyle } = req.body;

        // Validate input
        if (!masterResume || !jobDescription || !communicationStyle) {
            return res.status(400).json({
                error: 'Missing required fields: masterResume, jobDescription, communicationStyle'
            });
        }

        // Create simple prompt for GPT-2
        const prompt = `Job Description: ${jobDescription.substring(0, 500)}

Resume to optimize: ${masterResume.substring(0, 1000)}

Optimized resume bullet points:
• `;

        // Validate environment variable
        if (!process.env.HUGGINGFACE_TOKEN) {
            console.error('HUGGINGFACE_TOKEN not found in environment variables');
            return res.status(500).json({
                error: 'Server configuration error. Please contact support.',
                details: 'Missing API configuration'
            });
        }

        // Call Hugging Face API
        const hfResponse = await fetch(
            "https://api-inference.huggingface.co/models/gpt2",
            {
                headers: {
                    Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                method: "POST",
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_length: 200,
                        temperature: 0.7,
                        do_sample: true,
                        return_full_text: false
                    },
                    options: {
                        wait_for_model: true
                    }
                }),
            }
        );

        if (!hfResponse.ok) {
            const errorData = await hfResponse.text();
            console.error('Hugging Face API error:', errorData);

            // Handle model loading case
            if (hfResponse.status === 503) {
                return res.status(503).json({
                    error: 'AI model is loading. Please try again in 30 seconds.',
                    retryAfter: 30
                });
            }

            return res.status(500).json({
                error: 'AI service temporarily unavailable',
                details: errorData
            });
        }

        const hfResult = await hfResponse.json();

        // Handle different response formats
        let generatedText = '';
        if (Array.isArray(hfResult) && hfResult[0]?.generated_text) {
            generatedText = hfResult[0].generated_text;
        } else if (hfResult.generated_text) {
            generatedText = hfResult.generated_text;
        } else {
            console.error('Unexpected HF response format:', hfResult);
            return res.status(500).json({
                error: 'Unexpected response format from AI service'
            });
        }

        // Clean and format the response
        const bulletPoints = generatedText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')))
            .map(line => line.replace(/^[•\-*]\s*/, '• '))
            .slice(0, 6); // Limit to 6 points max

        // Fallback if no bullet points found
        if (bulletPoints.length === 0) {
            const fallbackPoints = generatedText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 20) // Reasonable length for bullet points
                .slice(0, 5)
                .map(line => `• ${line}`);

            if (fallbackPoints.length > 0) {
                return res.json({
                    success: true,
                    optimizedPoints: fallbackPoints,
                    message: 'Resume optimized successfully!'
                });
            }
        }

        if (bulletPoints.length === 0) {
            return res.status(500).json({
                error: 'Could not generate optimized bullet points. Please try again.'
            });
        }

        return res.json({
            success: true,
            optimizedPoints: bulletPoints,
            message: `Generated ${bulletPoints.length} optimized bullet points!`
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Please try again later'
        });
    }
}