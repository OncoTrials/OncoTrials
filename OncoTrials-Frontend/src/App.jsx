import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import { RequireAuth } from './utils/Auth';
import HomePage from './pages/HomePage';
import PatientLoginPage from './pages/Patient/PatientLoginPage';
import PatientRegister from './pages/Patient/PatientRegister';
import PhysicianCRCRegisterPage from './pages/PhysicianCRCRegisterPage';
import PhysicianCRCLoginPage from './pages/PhysicianCRCLoginPage';
import ForgotPassword from './pages/ForgotPassword';
import PatientDashboard from './pages/Patient/PatientDashboard';
import PatientSettings from './pages/Patient/PatientSettings';
import ChangePassword from './pages/ChangePassword';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthCallback from './components/AuthCallback';
import './App.css'

export const queryClient = new QueryClient();

function App() {

  return (
    <QueryClientProvider client={queryClient}>
    <Router>
      <Routes>
        <Route path='/' element={<HomePage/>} />
        <Route path='/patient-login' element={<PatientLoginPage/>} />
        <Route path='/patient-register' element={<PatientRegister/>} />
        <Route path='/physician-crc-register' element={<PhysicianCRCRegisterPage/>} />
        <Route path='/physician-crc-login' element={<PhysicianCRCLoginPage/>} />
        <Route path='/forgot-password' element={<ForgotPassword/>} />
        <Route path='/change-password' element={<ChangePassword/>} />
        <Route path='/auth/callback' element={<AuthCallback/>} />
        {/* Patient only routes */}
        <Route element={ <RequireAuth redirectTo='/patient-login' allowedRoles={['patient']} />} >
          <Route path='/patient-dashboard' element={<PatientDashboard/>} />
          <Route path='/patient-settings' element={<PatientSettings/>} />
        </Route>
      </Routes>
    </Router>
    </QueryClientProvider>
  )
}

export default App
