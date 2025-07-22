import React, { useState, useCallback, useEffect } from 'react';
import { TableRow } from './types.ts';
import TablePreview from './components/TablePreview.tsx';
import JsonPreview from './components/JsonPreview.tsx';
import { DropboxIcon, TrashIcon, TableIcon, CodeIcon, ClipboardIcon } from './components/icons.tsx';

type View = 'table' | 'json';

// This is a global from the Dropbox script included in index.html
declare const Dropbox: any;

/**
 * Parses an HTML string to find a table and extract its headers and data.
 * @param html The HTML string to parse.
 * @returns An object with headers and data, or null if parsing fails.
 */
const parseHtmlTable = (html: string): { headers: string[]; data: TableRow[] } | null => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const table = doc.querySelector('table');
        if (!table) return null;

        const foundHeaders = Array.from(table.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td')).map(th => th.textContent?.trim() || '');
        if (foundHeaders.length === 0) return null;

        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const dataRows = rows.length > 0 ? rows : Array.from(table.querySelectorAll('tr')).slice(1);

        const parsedData = dataRows.map(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            const rowData: TableRow = {};
            foundHeaders.forEach((header, index) => {
                rowData[header] = cells[index]?.textContent?.trim() || '';
            });
            return rowData;
        });
        
        return { headers: foundHeaders, data: parsedData };
    } catch (e) {
        console.warn("HTML table parsing failed", e);
        return null;
    }
};

/**
 * Parses a plain text string (CSV/TSV) into headers and data.
 * @param text The plain text to parse.
 * @returns An object with headers and data, or null if parsing fails.
 */
const parseTextData = (text: string): { headers: string[]; data: TableRow[] } | null => {
    try {
        const lines = text.trim().split('\n').filter(line => line.trim() !== '');
        if (lines.length < 1) return null; // Must have at least a header row

        // Detect delimiter: prefer tab, fall back to comma
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        
        const foundHeaders = lines[0].split(delimiter).map(h => h.trim());
        if (foundHeaders.length === 0 || (foundHeaders.length === 1 && foundHeaders[0] === '')) return null;

        const dataRows = lines.slice(1);
        const parsedData = dataRows.map(row => {
            const cells = row.split(delimiter).map(c => c.trim());
            const rowData: TableRow = {};
            foundHeaders.forEach((header, index) => {
                rowData[header] = cells[index] || '';
            });
            return rowData;
        });

        return { headers: foundHeaders, data: parsedData };
    } catch (e) {
        console.warn("Text data parsing failed", e);
        return null;
    }
};

const App: React.FC = () => {
  const [inputContent, setInputContent] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<TableRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('table');
  const [isDropboxKeyProvided, setIsDropboxKeyProvided] = useState(false);

  useEffect(() => {
    const dropboxScript = document.getElementById('dropboxjs');
    const appKey = dropboxScript?.getAttribute('data-app-key');
    if (appKey && appKey !== 'YOUR_APP_KEY_HERE' && appKey.trim() !== '') {
      setIsDropboxKeyProvided(true);
    } else {
      setIsDropboxKeyProvided(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setInputContent('');
    setHeaders([]);
    setData([]);
    setError(null);
    setView('table');
  }, []);

  const processInput = useCallback((text: string, html?: string) => {
    if (!text.trim()) {
        handleClear();
        return;
    }

    let result: { headers: string[], data: TableRow[] } | null = null;

    if (html) {
        result = parseHtmlTable(html);
    }

    if (!result) {
        result = parseTextData(text);
    }
    
    if (result) {
        setHeaders(result.headers);
        setData(result.data);
        setError(null);
        setView('table');
    } else {
        setError('Could not parse input. Please paste valid HTML table code, or comma/tab-separated text with a header row.');
        setData([]);
        setHeaders([]);
    }
  }, [handleClear]);

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedHtml = event.clipboardData.getData('text/html');
    const pastedText = event.clipboardData.getData('text/plain');
    if (pastedText || pastedHtml) {
        setInputContent(pastedText);
        processInput(pastedText, pastedHtml);
    }
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = event.target.value;
      setInputContent(newText);
      processInput(newText);
  }

  const handleSaveToDropbox = () => {
    if (!isDropboxKeyProvided) {
        setError("Dropbox is not configured. Please provide a valid App Key in index.html.");
        return;
    }
    if (data.length === 0 && headers.length === 0) return;

    const jsonString = JSON.stringify(data, null, 2);
    const dataUrl = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonString);

    try {
        if (typeof Dropbox === 'undefined' || !Dropbox.isBrowserSupported()) {
            throw new Error("Dropbox Saver not supported or available.");
        }
        Dropbox.save({
            files: [{ 'url': dataUrl, 'filename': 'table-data.json' }],
            success: () => {
                console.log("File saved to Dropbox successfully.");
                setError(null); // Clear error on success
            },
            error: (errorMessage: string) => {
                setError(`Could not save to Dropbox: ${errorMessage}`);
                console.error(errorMessage);
            }
        });
    } catch(e) {
        const err = e as Error;
        setError(`Dropbox Saver script failed. Error: ${err.message}. Ensure you are online and that the Dropbox configuration is correct.`);
        console.error(e);
    }
  };
  
  const hasHeaders = headers.length > 0;
  const canSave = hasHeaders || data.length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 md:p-8 bg-slate-50 text-slate-800">
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
        <header className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">HTML Table to JSON</h1>
            <p className="mt-2 text-lg text-slate-600">Paste table data, preview it, and upload the JSON to Dropbox.</p>
        </header>

        <div className="relative">
          <label htmlFor="html-input" className="sr-only">Paste Table Content</label>
          <div className="absolute top-3.5 left-3 flex items-center pointer-events-none">
            <ClipboardIcon className="h-5 w-5 text-slate-400" />
          </div>
          <textarea
            id="html-input"
            rows={8}
            className="block w-full pl-10 pr-4 py-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Paste your copied table data here (HTML or plain text)..."
            value={inputContent}
            onPaste={handlePaste}
            onChange={handleInputChange}
            aria-label="Table Data Input Area"
            aria-describedby="status-messages"
          />
        </div>

        {hasHeaders ? (
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 flex flex-col" style={{minHeight: '500px'}}>
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                 <div className="inline-flex rounded-md shadow-sm">
                    <button
                        onClick={() => setView('table')}
                        className={`relative inline-flex items-center gap-2 rounded-l-md px-3 py-2 text-sm font-semibold focus:z-10 transition-colors ${view === 'table' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'}`}
                    >
                        <TableIcon className="h-5 w-5" />
                        Table
                    </button>
                    <button
                        onClick={() => setView('json')}
                        className={`relative -ml-px inline-flex items-center gap-2 rounded-r-md px-3 py-2 text-sm font-semibold focus:z-10 transition-colors ${view === 'json' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'}`}
                    >
                         <CodeIcon className="h-5 w-5" />
                        JSON
                    </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <button
                  onClick={handleSaveToDropbox}
                  disabled={!canSave || !isDropboxKeyProvided}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                  aria-label="Save JSON data to Dropbox"
                  title={!isDropboxKeyProvided ? 'Dropbox is not configured. Add an App Key in index.html.' : 'Save JSON to Dropbox'}
                >
                  <DropboxIcon className="h-5 w-5 fill-current"/>
                  Save to Dropbox
                </button>
                <button
                  onClick={handleClear}
                  className="inline-flex items-center justify-center p-2 text-slate-500 bg-white rounded-md ring-1 ring-inset ring-slate-300 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
                  aria-label="Clear all data and input"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-grow overflow-auto">
              {view === 'table' ? <TablePreview headers={headers} data={data} /> : <JsonPreview data={data} />}
            </div>
          </div>
        ) : (
            <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col justify-center items-center" style={{minHeight: '500px'}}>
                <TableIcon className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-2 text-lg font-medium text-slate-900">No data to display</h3>
                <p className="mt-1 text-sm text-slate-500">Paste some table data in the box above to get started.</p>
            </div>
        )}
      </div>
      <footer className="w-full max-w-7xl mx-auto mt-8 text-center text-sm text-slate-500">
        <p>
            The "Save to Dropbox" button requires a valid App Key and 
            <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:text-indigo-500"> correctly configured domains</a>.
        </p>
      </footer>
    </div>
  );
};

export default App;
