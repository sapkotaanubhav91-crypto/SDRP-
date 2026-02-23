import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface SpreadsheetViewProps {
  bookId: string;
  initialContent: string | null;
}

export default function SpreadsheetView({ bookId, initialContent }: SpreadsheetViewProps) {
  const [grid, setGrid] = useState<string[][]>(() => {
    try {
      const parsed = initialContent ? JSON.parse(initialContent) : null;
      if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
        return parsed;
      }
      // Default 10x5 grid
      return Array.from({ length: 10 }, () => Array(5).fill(''));
    } catch {
      return Array.from({ length: 10 }, () => Array(5).fill(''));
    }
  });
  const [saving, setSaving] = useState(false);

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    setGrid(prev => prev.map((row, rIndex) => 
      rIndex === rowIndex 
        ? row.map((cell, cIndex) => cIndex === colIndex ? value : cell)
        : row
    ));
  };

  const addRow = () => {
    setGrid(prev => {
      const cols = prev[0]?.length || 5;
      return [...prev, Array(cols).fill('')];
    });
  };

  const addColumn = () => {
    setGrid(prev => prev.map(row => [...row, '']));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: JSON.stringify(grid) }),
      });
      if (!res.ok) throw new Error('Failed to save');
    } catch (error) {
      console.error('Failed to save', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex gap-3">
          <button
            onClick={addRow}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
          <button
            onClick={addColumn}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add Column
          </button>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="inline-block min-w-full border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/20 shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-900/80 text-zinc-500 text-xs font-medium uppercase tracking-wider sticky top-0 z-0 backdrop-blur-sm">
              <tr>
                <th className="w-12 border-r border-b border-zinc-800 p-3 text-center bg-zinc-900/80 sticky left-0 z-10">#</th>
                {grid[0]?.map((_, i) => (
                  <th key={i} className="border-r border-b border-zinc-800 p-3 min-w-[120px] font-mono">
                    {String.fromCharCode(65 + i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {grid.map((row, rowIndex) => (
                <tr key={rowIndex} className="divide-x divide-zinc-800/50 hover:bg-zinc-900/40 transition-colors group">
                  <td className="p-3 text-center text-xs text-zinc-600 font-mono bg-zinc-900/30 border-r border-zinc-800 sticky left-0 group-hover:bg-zinc-900/60 transition-colors">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} className="p-0 relative min-w-[120px]">
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        className="w-full h-full px-4 py-3 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-emerald-500/50 focus:bg-zinc-900 text-zinc-300 placeholder-zinc-700 outline-none transition-all text-sm font-mono"
                        placeholder="..."
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
