// Content script for extracting job descriptions from various job sites
(function() {
    'use strict';

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'extractJobDescription') {
            try {
                const jobDescription = extractJobDescription();

                if (jobDescription && jobDescription.length > 50) {
                    sendResponse({
                        success: true,
                        jobDescription: jobDescription,
                        source: window.location.hostname
                    });
                } else {
                    sendResponse({
                        success: false,
                        error: 'Could not find a job description on this page. Make sure you\'re viewing a specific job posting.'
                    });
                }
            } catch (error) {
                console.error('Job extraction error:', error);
                sendResponse({
                    success: false,
                    error: 'Error extracting job description: ' + error.message
                });
            }
            return true; // Keep message channel open for async response
        }
    });

    function extractJobDescription() {
        const hostname = window.location.hostname.toLowerCase();

        // Site-specific extraction strategies
        if (hostname.includes('linkedin.com')) {
            return extractLinkedInJob();
        } else if (hostname.includes('indeed.com')) {
            return extractIndeedJob();
        } else if (hostname.includes('glassdoor.com')) {
            return extractGlassdoorJob();
        } else if (hostname.includes('angel.co') || hostname.includes('wellfound.com')) {
            return extractAngelJob();
        } else if (hostname.includes('stackoverflow.com')) {
            return extractStackOverflowJob();
        } else {
            return extractGenericJob();
        }
    }

    function extractLinkedInJob() {
        // LinkedIn job description selectors
        const selectors = [
            '[data-job-details] .jobs-description__content',
            '.jobs-search__job-details--container .jobs-description-content__text',
            '.jobs-description-content__text',
            '.jobs-box__html-content',
            '.jobs-description__content .jobs-description-content__text'
        ];

        return extractWithSelectors(selectors) || extractLinkedInFallback();
    }

    function extractLinkedInFallback() {
        // Fallback for LinkedIn's dynamic content
        const containers = document.querySelectorAll('[class*="jobs-description"], [class*="job-details"]');

        for (let container of containers) {
            const text = cleanText(container.innerText);
            if (text.length > 200) {
                return text;
            }
        }
        return null;
    }

    function extractIndeedJob() {
        const selectors = [
            '.jobsearch-JobComponent-description',
            '.jobsearch-jobDescriptionText',
            '#jobDescriptionText',
            '.jobsearch-JobMetadataHeader-item',
            '.jobsearch-JobComponent-description div'
        ];

        return extractWithSelectors(selectors);
    }

    function extractGlassdoorJob() {
        const selectors = [
            '[data-test="jobDescription"]',
            '.jobDescriptionContent',
            '.desc',
            '#JobDescContainer',
            '.jobDescription'
        ];

        return extractWithSelectors(selectors);
    }

    function extractAngelJob() {
        const selectors = [
            '[data-test="JobDescription"]',
            '.job_description',
            '.startup-job-description',
            '.component_a9eb2'
        ];

        return extractWithSelectors(selectors);
    }

    function extractStackOverflowJob() {
        const selectors = [
            '.job-description',
            '.job-details .mb32',
            '#overview + div',
            '.job-description-content'
        ];

        return extractWithSelectors(selectors);
    }

    function extractGenericJob() {
        // Generic extraction for company career pages
        const selectors = [
            '[class*="job-description"]',
            '[class*="job_description"]',
            '[class*="jobDescription"]',
            '[id*="job-description"]',
            '[id*="description"]',
            '[class*="description"]',
            '[class*="job-details"]',
            '[class*="job_details"]',
            '[class*="jobDetails"]',
            '[class*="position-description"]',
            '[class*="role-description"]',
            'main article',
            'main section',
            '.content',
            '.main-content'
        ];

        // Try specific selectors first
        const result = extractWithSelectors(selectors);
        if (result) return result;

        // Fallback: Look for the longest text block that looks like a job description
        return extractLongestRelevantText();
    }

    function extractWithSelectors(selectors) {
        for (let selector of selectors) {
            try {
                const elements = document.querySelectorAll(selector);

                for (let element of elements) {
                    const text = cleanText(element.innerText || element.textContent);

                    // Filter out elements that are too short or look like navigation
                    if (text.length > 200 && isJobDescriptionLike(text)) {
                        return text;
                    }
                }
            } catch (e) {
                console.warn('Selector failed:', selector, e);
                continue;
            }
        }
        return null;
    }

    function extractLongestRelevantText() {
        const textBlocks = [];

        // Get all text-heavy elements
        const elements = document.querySelectorAll('div, section, article, p');

        elements.forEach(element => {
            const text = cleanText(element.innerText || element.textContent);

            if (text.length > 300 && isJobDescriptionLike(text)) {
                textBlocks.push({
                    text: text,
                    length: text.length,
                    element: element
                });
            }
        });

        // Sort by length and relevance
        textBlocks.sort((a, b) => {
            const aScore = calculateJobDescriptionScore(a.text);
            const bScore = calculateJobDescriptionScore(b.text);
            return bScore - aScore;
        });

        return textBlocks.length > 0 ? textBlocks[0].text : null;
    }

    function isJobDescriptionLike(text) {
        const jobKeywords = [
            'responsibilities', 'requirements', 'qualifications', 'experience',
            'skills', 'role', 'position', 'candidate', 'job', 'work', 'team',
            'company', 'opportunity', 'looking for', 'seeking', 'years', 'degree'
        ];

        const lowerText = text.toLowerCase();
        const keywordCount = jobKeywords.filter(keyword => lowerText.includes(keyword)).length;

        return keywordCount >= 3;
    }

    function calculateJobDescriptionScore(text) {
        const lowerText = text.toLowerCase();
        let score = text.length / 10; // Base score from length

        // Boost score for job-related keywords
        const keywords = {
            'responsibilities': 50,
            'requirements': 50,
            'qualifications': 40,
            'experience': 30,
            'skills': 30,
            'years of experience': 40,
            'bachelor': 20,
            'master': 20,
            'degree': 15,
            'team': 10,
            'role': 20,
            'position': 20,
            'candidate': 25,
            'ideal candidate': 35,
            'looking for': 30,
            'seeking': 25,
            'salary': 15,
            'benefits': 10,
            'remote': 10,
            'hybrid': 10
        };

        Object.entries(keywords).forEach(([keyword, points]) => {
            if (lowerText.includes(keyword)) {
                score += points;
            }
        });

        // Penalty for navigation/header text
        const penalties = ['navigation', 'menu', 'header', 'footer', 'cookie', 'privacy'];
        penalties.forEach(penalty => {
            if (lowerText.includes(penalty)) {
                score -= 20;
            }
        });

        return score;
    }

    function cleanText(text) {
        if (!text) return '';

        return text
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .replace(/\n\s*\n/g, '\n')  // Remove extra line breaks
            .trim()
            .substring(0, 5000); // Limit length to avoid overwhelming the API
    }

    // Debug function to help identify selectors on new sites
    function debugExtraction() {
        if (window.location.search.includes('debug=applyninja')) {
            console.log('ApplyNinja Debug Mode');
            console.log('Current site:', window.location.hostname);
            console.log('Extracted job description:', extractJobDescription());
        }
    }

    // Run debug on page load if debug parameter is present
    debugExtraction();

})();