document.addEventListener('DOMContentLoaded', function() {
    const masterResumeTextarea = document.getElementById('master-resume');
    const communicationStyleTextarea = document.getElementById('communication-style');
    const saveButton = document.getElementById('save-button');
    const successMessage = document.getElementById('success-message');

    loadStoredData();

    function loadStoredData() {
        chrome.storage.local.get(['masterResume', 'communicationStyle'], function(result) {
            if (result.masterResume) {
                masterResumeTextarea.value = result.masterResume;
            }

            if (result.communicationStyle) {
                communicationStyleTextarea.value = result.communicationStyle;
            }
        });
    }

    saveButton.addEventListener('click', function() {
        const masterResume = masterResumeTextarea.value.trim();
        const communicationStyle = communicationStyleTextarea.value.trim();

        if (!masterResume) {
            alert('Please enter your master resume before saving.');
            masterResumeTextarea.focus();
            return;
        }

        if (!communicationStyle) {
            alert('Please enter your communication style before saving.');
            communicationStyleTextarea.focus();
            return;
        }

        const dataToSave = {
            masterResume: masterResume,
            communicationStyle: communicationStyle,
            savedAt: new Date().toISOString()
        };

        chrome.storage.local.set(dataToSave, function() {
            if (chrome.runtime.lastError) {
                console.error('Error saving data:', chrome.runtime.lastError);
                alert('Error saving profile. Please try again.');
                return;
            }

            showSuccessMessage();
            console.log('Profile saved successfully');
        });
    });

    function showSuccessMessage() {
        successMessage.style.display = 'block';

        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
    }

    masterResumeTextarea.addEventListener('input', function() {
        updateCharacterCount('master-resume', this.value.length);
    });

    communicationStyleTextarea.addEventListener('input', function() {
        updateCharacterCount('communication-style', this.value.length);
    });

    function updateCharacterCount(fieldId, count) {
        console.log(`${fieldId}: ${count} characters`);
    }

    window.addEventListener('beforeunload', function(e) {
        const masterResumeValue = masterResumeTextarea.value.trim();
        const communicationStyleValue = communicationStyleTextarea.value.trim();

        chrome.storage.local.get(['masterResume', 'communicationStyle'], function(result) {
            const hasUnsavedMasterResume = result.masterResume !== masterResumeValue && masterResumeValue !== '';
            const hasUnsavedCommunicationStyle = result.communicationStyle !== communicationStyleValue && communicationStyleValue !== '';

            if (hasUnsavedMasterResume || hasUnsavedCommunicationStyle) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    });
});