import React from 'react';
import { TableRow } from '../types.ts';

interface TablePreviewProps {
  headers: string[];
  data: TableRow[];
}

const TablePreview: React.FC<TablePreviewProps> = ({ headers, data }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm text-left text-slate-500">
        <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0">
          <tr>
            {headers.map((header, index) => (
              <th key={index} scope="col" className="px-6 py-3 whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="bg-white border-b hover:bg-slate-50">
              {headers.map((header, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  {row[header] || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablePreview;
