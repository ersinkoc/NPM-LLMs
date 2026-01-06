import { Routes, Route } from 'react-router-dom';
import { Layout } from './layouts/Layout';
import { Home } from './pages/Home';
import { Docs } from './pages/Docs';
import { API } from './pages/API';
import { Examples } from './pages/Examples';
import { Plugins } from './pages/Plugins';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="docs/*" element={<Docs />} />
        <Route path="api" element={<API />} />
        <Route path="examples" element={<Examples />} />
        <Route path="plugins" element={<Plugins />} />
      </Route>
    </Routes>
  );
}
