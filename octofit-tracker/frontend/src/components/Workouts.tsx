import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

interface Suggestion {
  _id: string;
  title: string;
  focus: string;
  minutes: number;
  difficulty: string;
  reason: string;
}

interface SuggestionsResponse {
  suggestions: Suggestion[];
}

const USER_EMAIL = 'mona@example.com';

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const encodedEmail = encodeURIComponent(USER_EMAIL);
        const data = await getJson<SuggestionsResponse>(`/api/workouts/suggestions/${encodedEmail}`);
        setSuggestions(data.suggestions);
      } catch (err) {
        setError('Unable to load workout suggestions');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        
        {loading && (
          <div role="status" className="alert alert-info">
            Loading workout suggestions...
          </div>
        )}
        
        {error && (
          <div role="alert" className="alert alert-danger">
            {error}
          </div>
        )}
        
        {!loading && !error && suggestions.length === 0 && (
          <div className="alert alert-secondary">
            No workout suggestions available
          </div>
        )}
        
        {!loading && !error && suggestions.length > 0 && (
          <div className="list-group">
            {suggestions.map((suggestion) => (
              <div key={`workout-${suggestion._id}`} className="list-group-item">
                <h5>{suggestion.title}</h5>
                <p className="mb-1"><strong>Focus:</strong> {suggestion.focus}</p>
                <p className="mb-1"><strong>Duration:</strong> {suggestion.minutes} min</p>
                <p className="mb-1"><strong>Difficulty:</strong> {suggestion.difficulty}</p>
                <p className="mb-0"><strong>Reason:</strong> {suggestion.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
