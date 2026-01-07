import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Home } from '@/pages/Home';
import { Docs } from '@/pages/docs/Docs';
import { DocsInstallation } from '@/pages/docs/Installation';
import { DocsQuickStart } from '@/pages/docs/QuickStart';
import { DocsCLI } from '@/pages/docs/CLI';
import { DocsPlugins } from '@/pages/docs/Plugins';
import { DocsAIProviders } from '@/pages/docs/AIProviders';
import { API } from '@/pages/api/API';
import { Examples } from '@/pages/Examples';
import { NotFound } from '@/pages/NotFound';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/docs/installation" element={<DocsInstallation />} />
        <Route path="/docs/quick-start" element={<DocsQuickStart />} />
        <Route path="/docs/cli/commands" element={<DocsCLI />} />
        <Route path="/docs/cli/options" element={<DocsCLI />} />
        <Route path="/docs/plugins" element={<DocsPlugins />} />
        <Route path="/docs/plugins/ai-providers" element={<DocsAIProviders />} />
        <Route path="/docs/plugins/custom" element={<DocsPlugins />} />
        <Route path="/api" element={<API />} />
        <Route path="/api/:section" element={<API />} />
        <Route path="/examples" element={<Examples />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
