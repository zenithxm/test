document.getElementById('tablePasteArea').addEventListener('paste', function(event) {
    const text = (event.clipboardData || window.clipboardData).getData('text');
    const rows = text.split('\n').filter(row => row.trim() !== '');
    if (!rows.length) return;

    // Parse the first row to get headers
    const headers = rows[0].split('\t').map(header => header.trim());

    // Create an array of objects for each subsequent row
    const data = rows.slice(1).map(row => {
        const values = row.split('\t').map(value => value.trim());
        return headers.reduce((acc, header, index) => {
            acc[header] = values[index];
            return acc;
        }, {});
    });

    // Display the table
    const tablePreview = document.getElementById('tablePreview');
    tablePreview.innerHTML = '<table><thead><tr>' +
        headers.map(header => `<th>${header}</th>`).join('') +
        '</tr></thead><tbody>' +
        data.map(row => '<tr>' + headers.map(header => `<td>${row[header]}</td>`).join('') + '</tr>').join('') +
        '</tbody></table>';

    // Display the JSON
    const jsonOutput = document.getElementById('jsonOutput');
    jsonOutput.textContent = JSON.stringify(data, null, 2);
});

// Function to extract access token from URL
function getAccessTokenFromUrl() {
    try {
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        const token = urlParams.get('access_token');
        if (!token) {
            throw new Error('No access token found in URL');
        }
        return token;
    } catch (error) {
        console.error('Error getting access token from URL:', error);
        setError('Failed to retrieve access token from URL. Please try again.');
        return null;
    }
}

let accessToken = getAccessTokenFromUrl();

// Dropbox app key and redirect URI
const appKey = 'hrxfrcq435yhye9'; // Replace with your actual app key
const redirectUri = window.location.origin + window.location.pathname; // Use current page URL

// Function to initiate Dropbox authorization
function authorizeWithDropbox() {
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${appKey}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
     // Store the current URL to redirect back after authorization
    sessionStorage.setItem('preAuthURL', window.location.href);

    window.location.href = authUrl;

}

async function uploadJsonToDropbox() {
    const uploadPath = '/Your/Desired/Path'; // TODO: Change this to your desired upload path

    // Get the JSON data from the textarea
    const jsonData = document.getElementById('jsonOutput').value;

    if (!accessToken) {
         // Store the current URL to redirect back after authorization
        sessionStorage.setItem('preAuthURL', window.location.href);
        // Redirect to Dropbox authorization if no access token
        authorizeWithDropbox();
        return;
    }

    await uploadToDropbox(jsonData, uploadPath, accessToken);
}

async function uploadToDropbox(jsonData, uploadPath, accessToken) {
    const dbx = new Dropbox.Dropbox({
        accessToken: accessToken
    });

    const fileName = 'table-data.json';
    const fileContent = JSON.stringify(JSON.parse(jsonData), null, 2);

    try {
        // Check if the folder exists, create if not
        try {
            await dbx.filesGetMetadata({ path: uploadPath });
        } catch (error) {
            if (error.error && error.error.error_summary.includes('path/not_found')) {
                try {
                    await dbx.filesCreateFolderV2({ path: uploadPath });
                    console.log('Folder created successfully');
                } catch (createError) {
                    console.error('Error creating folder:', createError);
                    setError(`Could not create folder: ${createError.error.error_summary}`);
                    return;
                }
            }
        }

        // Upload the file
        await dbx.filesUpload({
            path: uploadPath + '/' + fileName,
            contents: fileContent,
            mode: 'overwrite'
        });

        console.log('File uploaded successfully!');
        setError(null); // Clear error on success

    }  catch (error) {
         if (error.error && error.error.error_summary.includes('oauth2/token_access_denied')) {
            console.error('Access token expired or invalid. Redirecting to authorization.');
            setError('Your Dropbox access has expired. Please re-authorize.');
            authorizeWithDropbox();
            return;
        }
        console.error('Error uploading file:', error);
        setError(`Could not upload to Dropbox: ${error.error.error_summary}`);
    }
}

function setError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.innerText = message ? message : '';
}

// Add event listener to authorize button
document.getElementById('authorizeButton').addEventListener('click', authorizeWithDropbox);

// Check for access token on page load
if (accessToken) {
    console.log('Access token found:', accessToken);

     // Redirect to the pre-auth URL if it exists
    const preAuthURL = sessionStorage.getItem('preAuthURL');
        if (preAuthURL) {
            sessionStorage.removeItem('preAuthURL');
            window.location.href = preAuthURL;
        }

} else {
    console.log('No access token found.');
}
