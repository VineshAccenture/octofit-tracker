import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

interface Activity {
  _id: string;
  user: string;
  team: string;
  type: string;
  minutes: number;
  points: number;
  occurredAt: string;
}

interface ActivitiesResponse {
  activities: Activity[];
}

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getJson<ActivitiesResponse>('/api/activities');
        setActivities(data.activities);
      } catch (err) {
        setError('Unable to load activities');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Activities</h2>
        <p>Track student activity minutes and points.</p>
        
        {loading && (
          <div role="status" className="alert alert-info">
            Loading activities...
          </div>
        )}
        
        {error && (
          <div role="alert" className="alert alert-danger">
            {error}
          </div>
        )}
        
        {!loading && !error && activities.length === 0 && (
          <div className="alert alert-secondary">
            No activities yet
          </div>
        )}
        
        {!loading && !error && activities.length > 0 && (
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Type</th>
                <th>Minutes</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={`activity-${activity._id}`}>
                  <td>{activity.type}</td>
                  <td>{activity.minutes}</td>
                  <td>{activity.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
