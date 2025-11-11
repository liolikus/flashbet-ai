import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProviders } from './contexts';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';

function App() {
  return (
    <AppProviders>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </Layout>
      </Router>
    </AppProviders>
  );
}

export default App;
