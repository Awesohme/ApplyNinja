document.addEventListener('DOMContentLoaded', function() {
    const scanButton = document.getElementById('scan-button');
    const output = document.getElementById('output');
    const settingsLink = document.getElementById('settings-link');

    // Status indicators
    const resumeStatus = document.getElementById('resume-status');
    const styleStatus = document.getElementById('style-status');
    const pageStatus = document.getElementById('page-status');

    // Configuration - Vercel deployment URL
    const API_ENDPOINT = 'https://apply-ninja-7x9alq90l-olamides-projects-8e41d71c.vercel.app/api/optimize-resume';

    // Initialize popup
    init();

    async function init() {
        await checkUserProfile();
        await checkCurrentPage();
        updateScanButtonState();
    }

    async function checkUserProfile() {
        try {
            const result = await chrome.storage.local.get(['masterResume', 'communicationStyle']);

            // Update resume status
            if (result.masterResume && result.masterResume.trim().length > 100) {
                resumeStatus.className = 'status-indicator status-ready';
            } else {
                resumeStatus.className = 'status-indicator status-missing';
            }

            // Update style status
            if (result.communicationStyle && result.communicationStyle.trim().length > 50) {
                styleStatus.className = 'status-indicator status-ready';
            } else {
                styleStatus.className = 'status-indicator status-missing';
            }

        } catch (error) {
            console.error('Error checking user profile:', error);
        }
    }

    async function checkCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // Check if we're on a job-related page
            const jobSitePatterns = [
                /linkedin\.com.*\/jobs\//,
                /indeed\.com.*\/viewjob/,
                /glassdoor\.com.*\/job-listing/,
                /angel\.co.*\/jobs/,
                /stackoverflow\.com.*\/jobs/,
                /remote\.co\/job/,
                /weworkremotely\.com.*\/job/,
                /jobs\./,
                /careers\./,
                /career/,
                /job/
            ];

            const isJobPage = jobSitePatterns.some(pattern => pattern.test(tab.url.toLowerCase()));

            if (isJobPage) {
                pageStatus.className = 'status-indicator status-ready';
            } else {
                pageStatus.className = 'status-indicator status-missing';
            }

        } catch (error) {
            console.error('Error checking current page:', error);
            pageStatus.className = 'status-indicator status-missing';
        }
    }

    function updateScanButtonState() {
        const resumeReady = resumeStatus.classList.contains('status-ready');
        const styleReady = styleStatus.classList.contains('status-ready');
        const pageReady = pageStatus.classList.contains('status-ready');

        if (resumeReady && styleReady && pageReady) {
            scanButton.disabled = false;
            scanButton.textContent = 'Scan & Optimize Now';
        } else {
            scanButton.disabled = true;
            if (!resumeReady || !styleReady) {
                scanButton.textContent = 'Configure Profile First';
            } else if (!pageReady) {
                scanButton.textContent = 'Visit a Job Page';
            }
        }
    }

    scanButton.addEventListener('click', async function() {
        if (scanButton.disabled) return;

        try {
            await optimizeResume();
        } catch (error) {
            console.error('Error during optimization:', error);
            showError('An unexpected error occurred. Please try again.');
        }
    });

    async function optimizeResume() {
        // Show loading state
        showLoading();

        try {
            // Step 1: Get user profile data
            const profileData = await chrome.storage.local.get(['masterResume', 'communicationStyle']);

            if (!profileData.masterResume || !profileData.communicationStyle) {
                throw new Error('Profile data missing. Please configure your settings first.');
            }

            // Step 2: Extract job description from current page
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            const jobDescription = await extractJobDescription(tab.id);

            if (!jobDescription || jobDescription.length < 50) {
                throw new Error('Could not extract job description from this page. Make sure you\'re on a job posting page.');
            }

            // Step 3: Call optimization API
            const optimizationData = {
                masterResume: profileData.masterResume,
                jobDescription: jobDescription,
                communicationStyle: profileData.communicationStyle
            };

            const result = await callOptimizationAPI(optimizationData);

            // Step 4: Display results
            displayResults(result);

        } catch (error) {
            console.error('Optimization error:', error);
            showError(error.message || 'Failed to optimize resume. Please try again.');
        }
    }

    async function extractJobDescription(tabId) {
        return new Promise(async (resolve, reject) => {
            try {
                // First, ensure content script is injected
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                });

                // Give it a moment to initialize
                setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, { action: 'extractJobDescription' }, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error('Could not communicate with the page. Please refresh and try again.'));
                            return;
                        }

                        if (response && response.success) {
                            resolve(response.jobDescription);
                        } else {
                            reject(new Error(response?.error || 'Could not extract job description from this page.'));
                        }
                    });
                }, 500);

            } catch (error) {
                reject(new Error('Failed to inject content script. Please refresh the page and try again.'));
            }
        });
    }

    async function callOptimizationAPI(data) {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            if (response.status === 503) {
                throw new Error('AI model is loading. Please wait 30 seconds and try again.');
            }

            throw new Error(errorData.error || `API request failed (${response.status})`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Optimization failed');
        }

        return result;
    }

    function showLoading() {
        scanButton.disabled = true;
        scanButton.innerHTML = '<div class="spinner"></div> Optimizing...';
        output.style.display = 'none';
    }

    function displayResults(result) {
        scanButton.disabled = false;
        scanButton.textContent = 'Scan & Optimize Now';

        const bulletPoints = result.optimizedPoints || [];

        if (bulletPoints.length === 0) {
            showError('No optimized points generated. Please try again.');
            return;
        }

        const html = `
            <div style="margin-bottom: 15px;">
                <strong>✨ ${result.message || 'Optimized Resume Points:'}</strong>
            </div>
            <div style="line-height: 1.6;">
                ${bulletPoints.map(point => `<div style="margin-bottom: 8px;">${point}</div>`).join('')}
            </div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                💡 Copy these points and update your resume for this specific job application.
            </div>
        `;

        output.innerHTML = html;
        output.style.display = 'block';
    }

    function showError(message) {
        scanButton.disabled = false;
        scanButton.textContent = 'Scan & Optimize Now';

        output.innerHTML = `
            <div class="error-message">
                <strong>❌ Error:</strong><br>
                ${message}
            </div>
        `;
        output.style.display = 'block';
    }

    // Settings link
    settingsLink.addEventListener('click', function(e) {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    // Refresh status when popup is opened
    chrome.tabs.onActivated.addListener(() => {
        setTimeout(init, 500); // Small delay to ensure tab is fully loaded
    });
});