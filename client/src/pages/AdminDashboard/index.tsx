import { useEffect, useState } from 'react';
import { fetchUsers } from '../../api/admin';
import './AdminDashboard.scss';

interface User {
  _id: string;
  name: string;
  phone: string;
  role: string;
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchUsers();
        const items = Array.isArray(data.items) ? (data.items as User[]) : [];
        setUsers(items);
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <section>
        <h2>Users</h2>
        <ul>
          {users.map((u) => (
            <li key={u._id}>{u.name} - {u.role}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminDashboard;
