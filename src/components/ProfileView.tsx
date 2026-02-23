import { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, AlertTriangle, Key } from 'lucide-react';
import { cn } from '../lib/utils';

interface Entry {
  id: string;
  type: 'trait' | 'weakness' | 'secret' | 'feature';
  content: string;
}

interface ProfileViewProps {
  bookId: string;
}

export default function ProfileView({ bookId }: ProfileViewProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEntry, setNewEntry] = useState('');
  const [activeTab, setActiveTab] = useState<'trait' | 'weakness' | 'secret'>('trait');

  useEffect(() => {
    fetchEntries();
  }, [bookId]);

  const fetchEntries = async () => {
    try {
      const res = await fetch(`/api/books/${bookId}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch entries', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.trim()) return;

    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: bookId, type: activeTab, content: newEntry }),
      });

      if (res.ok) {
        const entry = await res.json();
        setEntries([...entries, entry]);
        setNewEntry('');
      }
    } catch (error) {
      console.error('Failed to add entry', error);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await fetch(`/api/entries/${id}`, { method: 'DELETE' });
      setEntries(entries.filter((e) => e.id !== id));
    } catch (error) {
      console.error('Failed to delete entry', error);
    }
  };

  const filteredEntries = entries.filter((e) => e.type === activeTab);

  const tabs = [
    { id: 'trait', label: 'Traits', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-900/20' },
    { id: 'weakness', label: 'Weaknesses', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
    { id: 'secret', label: 'Secrets', icon: Key, color: 'text-red-400', bg: 'bg-red-900/20' },
  ];

  return (
    <div className="p-6">
      <div className="flex gap-4 mb-8 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === tab.id
                ? `border-${tab.color.split('-')[1]}-500 text-zinc-100`
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? tab.color : "text-zinc-600")} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* List */}
        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
              No {activeTab}s recorded yet.
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all"
              >
                <p className="text-zinc-200">{entry.content}</p>
                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Form */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 h-fit">
          <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
            Add New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h3>
          <form onSubmit={handleAddEntry} className="space-y-4">
            <textarea
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[100px] resize-none"
              placeholder={`Describe the ${activeTab}...`}
              required
            />
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
