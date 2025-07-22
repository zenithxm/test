import React from 'react';
import { TableRow } from '../types.ts';

interface JsonPreviewProps {
  data: TableRow[];
}

const JsonPreview: React.FC<JsonPreviewProps> = ({ data }) => {
  const jsonString = JSON.stringify(data, null, 2);

  return (
    <pre className="w-full h-full bg-slate-800 text-slate-100 p-4 lg:p-6 text-sm overflow-x-auto">
      <code className="whitespace-pre">
        {jsonString}
      </code>
    </pre>
  );
};

export default JsonPreview;
