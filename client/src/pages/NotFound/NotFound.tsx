import { Link } from 'react-router-dom';
import { paths } from '@/routes/paths';

const NotFound = () => (
  <main style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>Page Not Found</h2>
    <p>Sorry, the page you are looking for doesn't exist.</p>
    <Link to={paths.home()}>Go back home</Link>
  </main>
);

export default NotFound;
