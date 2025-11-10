import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TokenProvider } from './contexts/TokenContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';

function App() {
  return (
    <TokenProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </Layout>
      </Router>
    </TokenProvider>
  );
}

export default App;
