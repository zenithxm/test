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

async function uploadJsonToDropbox() {
    // Replace with your own access token


    // Get the JSON data from the textarea
    const jsonData = document.getElementById('jsonOutput').value;
    const jsonString = JSON.stringify(jsonData, null, 2);
    const dataUrl = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonString);

    Dropbox.save({
        files: [{ 'url': dataUrl, 'filename': 'table-data.json' }],
        success: () => {
            console.log("File saved to Dropbox successfully.");
            setError(null); // Clear error on success
        },
        error: (errorMessage) => {
            setError(`Could not save to Dropbox: ${errorMessage}`);
            console.error(errorMessage);
        }
    });

}