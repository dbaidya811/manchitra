import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export const AdminScreen: React.FC = () => {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [pandels, setPandels] = useState<any[]>([]);

  const login = async () => {
    setError('');
    try {
      await apiFetch('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      setAuthed(true);
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    }
  };

  useEffect(() => {
    if (!authed) return;
    apiFetch('/api/admin/stats').then(setStats).catch(() => {});
    apiFetch('/api/admin/pandels').then(setPandels).catch(() => {});
  }, [authed]);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-4 text-center">Admin Login</h2>
          <input className="w-full border rounded p-2 mb-3" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
          <input className="w-full border rounded p-2 mb-3" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button type="button" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded cursor-pointer" onClick={(e) => { e.preventDefault(); login(); }}>Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
      <p className="mb-4">Total pandals: {stats?.totalPandals}</p>
      <ul className="space-y-2">
        {pandels.map(p => (
          <li key={p.id} className="border rounded p-3 flex justify-between items-center">
            <span>{p.name}</span>
            <button className="text-red-600 hover:underline" onClick={async () => { await apiFetch(`/api/admin/pandels/${p.id}`, { method: 'DELETE' }); setPandels(prev=>prev.filter(x=>x.id!==p.id)); }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
