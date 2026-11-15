import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

interface Team {
  _id: string;
  name: string;
  mascot: string;
  members: string[];
}

interface TeamsResponse {
  teams: Team[];
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getJson<TeamsResponse>('/api/teams');
        setTeams(data.teams);
      } catch (err) {
        setError('Unable to load teams');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        
        {loading && (
          <div role="status" className="alert alert-info">
            Loading teams...
          </div>
        )}
        
        {error && (
          <div role="alert" className="alert alert-danger">
            {error}
          </div>
        )}
        
        {!loading && !error && teams.length === 0 && (
          <div className="alert alert-secondary">
            No teams yet
          </div>
        )}
        
        {!loading && !error && teams.length > 0 && (
          <div className="list-group">
            {teams.map((team) => (
              <div key={`team-${team._id}`} className="list-group-item">
                <h5>{team.name}</h5>
                <p className="mb-1">Mascot: {team.mascot}</p>
                <p className="mb-0">Members: {team.members.length}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
