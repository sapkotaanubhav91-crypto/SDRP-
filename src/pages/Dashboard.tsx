import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Book, Grid, Search, Trash2, MoreVertical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface Book {
  id: string;
  title: string;
  type: 'profile' | 'spreadsheet';
  created_at: string;
}

export default function Dashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'profile' | 'spreadsheet'>('profile');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch (error) {
      console.error('Failed to fetch books', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, type: newType }),
      });
      
      if (res.ok) {
        const text = await res.text();
        try {
          const newBook = JSON.parse(text);
          setBooks([newBook, ...books]);
          setIsCreating(false);
          setNewTitle('');
        } catch (e) {
          console.error('Failed to parse response:', text);
          alert('Server error: Received invalid response');
        }
      } else {
        console.error('Server error:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Failed to create book', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    try {
      await fetch(`/api/books/${id}`, { method: 'DELETE' });
      setBooks(books.filter((b) => b.id !== id));
    } catch (error) {
      console.error('Failed to delete book', error);
    }
  };

  const filteredBooks = books.filter((book) =>
    book.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Manage your dossiers and spreadsheets.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
        >
          <Plus className="w-4 h-4" />
          New Book
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          placeholder="Search books..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
        />
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-100 mb-4">Create New Book</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="e.g., Project Alpha"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('profile')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                      newType === 'profile'
                        ? "bg-emerald-900/20 border-emerald-500/50 text-emerald-400"
                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900"
                    )}
                  >
                    <Book className="w-6 h-6" />
                    <span className="text-xs font-medium">Dossier Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('spreadsheet')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                      newType === 'spreadsheet'
                        ? "bg-emerald-900/20 border-emerald-500/50 text-emerald-400"
                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900"
                    )}
                  >
                    <Grid className="w-6 h-6" />
                    <span className="text-xs font-medium">Spreadsheet</span>
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading secure data...</div>
      ) : filteredBooks.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          <p>No books found. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="group relative bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-emerald-900/10"
            >
              <Link to={`/book/${book.id}`} className="block">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "p-2 rounded-lg",
                    book.type === 'profile' ? "bg-blue-900/20 text-blue-400" : "bg-emerald-900/20 text-emerald-400"
                  )}>
                    {book.type === 'profile' ? <Book className="w-6 h-6" /> : <Grid className="w-6 h-6" />}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(book.id);
                    }}
                    className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-zinc-100 mb-1 truncate">{book.title}</h3>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
                  {book.type === 'profile' ? 'Dossier' : 'Spreadsheet'}
                </p>
                <div className="mt-4 text-xs text-zinc-600">
                  Created {new Date(book.created_at).toLocaleDateString()}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
