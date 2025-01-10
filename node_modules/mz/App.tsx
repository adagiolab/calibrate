import React, { useState } from 'react';
import { Plus, Trash2, Save, MoveHorizontal, Type, Hash, DollarSign, Wand2 } from 'lucide-react';
import { openai } from './services/ai';

interface CellData {
  value: string;
  type: 'text' | 'number' | 'currency';
}

interface TableData {
  headers: string[];
  rows: CellData[][];
}

export default function App() {
  const [tableData, setTableData] = useState<TableData>({
    headers: ['Feature', 'Option 1', 'Option 2'],
    rows: [[
      { value: '', type: 'text' },
      { value: '', type: 'text' },
      { value: '', type: 'text' }
    ]]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [productDescription, setProductDescription] = useState('');
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);

  const generateComparison = async () => {
    if (!productDescription) {
      alert('Please enter a product or service description first');
      return;
    }

    setIsLoading(true);
    try {
      const prompt = `Generate a comparison matrix for ${productDescription}. Include:
1. Key distinguishing features (at least 3)
2. Pricing information
3. Unique selling points
Format as JSON with this structure:
{
  "headers": ["Feature", "Vendor 1", "Vendor 2"],
  "rows": [
    { "feature": "Price", "type": "currency", "vendor1": "1000", "vendor2": "1200" },
    { "feature": "Feature 1", "type": "text", "vendor1": "Value 1", "vendor2": "Value 2" }
  ]
}`;

      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
      });

      const response = completion.choices[0].message.content;
      if (response) {
        const data = JSON.parse(response);
        
        setTableData({
          headers: data.headers,
          rows: data.rows.map(row => ([
            { value: row.feature, type: 'text' },
            { value: row.vendor1, type: row.type },
            { value: row.vendor2, type: row.type }
          ]))
        });
      }
    } catch (error) {
      console.error('Error generating comparison:', error);
      alert('Error generating comparison. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addColumn = () => {
    setTableData(prev => ({
      headers: [...prev.headers, `Option ${prev.headers.length}`],
      rows: prev.rows.map(row => [...row, { value: '', type: 'text' }])
    }));
  };

  const addRow = () => {
    setTableData(prev => ({
      ...prev,
      rows: [...prev.rows, new Array(prev.headers.length).fill(null).map(() => ({ value: '', type: 'text' }))]
    }));
  };

  const updateHeader = (index: number, value: string) => {
    setTableData(prev => ({
      ...prev,
      headers: prev.headers.map((h, i) => i === index ? value : h)
    }));
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    setTableData(prev => ({
      ...prev,
      rows: prev.rows.map((row, i) =>
        i === rowIndex
          ? row.map((cell, j) => j === colIndex ? { ...cell, value } : cell)
          : row
      )
    }));
  };

  const updateCellType = (rowIndex: number, colIndex: number, type: CellData['type']) => {
    setTableData(prev => ({
      ...prev,
      rows: prev.rows.map((row, i) =>
        i === rowIndex
          ? row.map((cell, j) => j === colIndex ? { ...cell, type } : cell)
          : row
      )
    }));
  };

  const deleteRow = (index: number) => {
    setTableData(prev => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== index)
    }));
  };

  const deleteColumn = (index: number) => {
    if (tableData.headers.length <= 2) return;
    setTableData(prev => ({
      headers: prev.headers.filter((_, i) => i !== index),
      rows: prev.rows.map(row => row.filter((_, i) => i !== index))
    }));
  };

  const handleDragStart = (index: number) => {
    setDraggedColumn(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColumn === null || draggedColumn === index) return;

    setTableData(prev => {
      const newHeaders = [...prev.headers];
      const newRows = prev.rows.map(row => [...row]);
      
      // Swap headers
      [newHeaders[draggedColumn], newHeaders[index]] = [newHeaders[index], newHeaders[draggedColumn]];
      
      // Swap columns in each row
      newRows.forEach(row => {
        [row[draggedColumn], row[index]] = [row[index], row[draggedColumn]];
      });

      return {
        headers: newHeaders,
        rows: newRows
      };
    });

    setDraggedColumn(index);
  };

  const formatValue = (cell: CellData) => {
    if (cell.type === 'currency') {
      const num = parseFloat(cell.value);
      return isNaN(num) ? cell.value : num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }
    if (cell.type === 'number') {
      const num = parseFloat(cell.value);
      return isNaN(num) ? cell.value : num.toLocaleString();
    }
    return cell.value;
  };

  const computeColumnTotal = (colIndex: number) => {
    const numbers = tableData.rows
      .map(row => row[colIndex])
      .filter(cell => cell.type === 'number' || cell.type === 'currency')
      .map(cell => parseFloat(cell.value))
      .filter(num => !isNaN(num));

    if (numbers.length === 0) return null;

    const total = numbers.reduce((sum, num) => sum + num, 0);
    const firstType = tableData.rows.find(row => 
      (row[colIndex].type === 'number' || row[colIndex].type === 'currency') && 
      !isNaN(parseFloat(row[colIndex].value)))?.type;

    return firstType === 'currency' 
      ? total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
      : total.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Comparison Table Builder</h1>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product/Service Description
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Enter product or service to compare..."
                className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={generateComparison}
                disabled={isLoading}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors disabled:bg-purple-400"
              >
                <Wand2 size={18} />
                {isLoading ? 'Generating...' : 'Generate Comparison'}
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {tableData.headers.map((header, index) => (
                    <th 
                      key={index} 
                      className="border p-2"
                      draggable={index > 0}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                    >
                      <div className="flex items-center gap-2">
                        {index > 0 && (
                          <MoveHorizontal size={18} className="text-gray-400 cursor-move" />
                        )}
                        <input
                          type="text"
                          value={header}
                          onChange={(e) => updateHeader(index, e.target.value)}
                          className="w-full bg-gray-50 p-2 rounded border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter header"
                        />
                        {index > 0 && (
                          <button
                            onClick={() => deleteColumn(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="border p-2 w-12">
                    <button
                      onClick={addColumn}
                      className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
                    >
                      <Plus size={18} className="mx-auto" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, colIndex) => (
                      <td key={colIndex} className="border p-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={cell.value}
                            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                            className="w-full p-2 rounded border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder={colIndex === 0 ? "Enter feature" : "Enter value"}
                          />
                          {colIndex > 0 && (
                            <div className="flex items-center">
                              <select
                                value={cell.type}
                                onChange={(e) => updateCellType(rowIndex, colIndex, e.target.value as CellData['type'])}
                                className="p-2 border border-gray-200 rounded"
                              >
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="currency">Currency</option>
                              </select>
                            </div>
                          )}
                        </div>
                        {cell.value && (
                          <div className="text-sm text-gray-600 mt-1">
                            {formatValue(cell)}
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="border p-2 w-12">
                      <button
                        onClick={() => deleteRow(rowIndex)}
                        className="w-full text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} className="mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="border p-2 font-bold">Total</td>
                  {tableData.headers.slice(1).map((_, index) => (
                    <td key={index} className="border p-2 font-bold">
                      {computeColumnTotal(index + 1)}
                    </td>
                  ))}
                  <td className="border p-2 w-12"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-4">
            <button
              onClick={addRow}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            >
              <Plus size={18} />
              Add Row
            </button>
            <button
              onClick={() => {
                alert('Table data saved to console');
                console.log(tableData);
              }}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              <Save size={18} />
              Save Table
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}