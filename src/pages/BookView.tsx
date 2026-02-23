import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Book, Grid, Trash2 } from 'lucide-react';
import ProfileView from '../components/ProfileView';
import SpreadsheetView from '../components/SpreadsheetView';
import { cn } from '../lib/utils';

interface BookDetails {
  id: string;
  title: string;
  type: 'profile' | 'spreadsheet';
  content: string | null;
}

export default function BookView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchBook(id);
  }, [id]);

  const fetchBook = async (bookId: string) => {
    try {
      const res = await fetch(`/api/books/${bookId}`);
      if (res.ok) {
        const data = await res.json();
        setBook(data);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to fetch book', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading secure data...</div>;
  if (!book) return null;

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-zinc-400 hover:text-zinc-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              book.type === 'profile' ? "bg-blue-900/20 text-blue-400" : "bg-emerald-900/20 text-emerald-400"
            )}>
              {book.type === 'profile' ? <Book className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100 leading-none">{book.title}</h1>
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                {book.type === 'profile' ? 'Dossier Profile' : 'Spreadsheet'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {book.type === 'profile' ? (
          <div className="h-full overflow-auto">
            <ProfileView bookId={book.id} />
          </div>
        ) : (
          <SpreadsheetView key={book.id} bookId={book.id} initialContent={book.content} />
        )}
      </div>
    </div>
  );
}
