import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import { RequireAuth } from './utils/Auth';
import HomePage from './pages/HomePage';
import PatientLoginPage from './pages/Patient/PatientLoginPage';
import PatientRegister from './pages/Patient/PatientRegister';
import PhysicianCRCRegisterPage from './pages/auth/PhysicianCRCRegisterPage';
import PhysicianCRCLoginPage from './pages/auth/PhysicianCRCLoginPage';
import ForgotPassword from './pages/auth/ForgotPassword';
import PatientDashboard from './pages/Patient/PatientDashboard';
import PatientSettings from './pages/Patient/PatientSettings';
import ChangePassword from './pages/auth/ChangePassword';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthCallback from './pages/auth/AuthCallback';
import PhysicianDashboard from './pages/physician/PhysicianDashboard';
import PhysicianSettings from './pages/physician/PhysicianSettings';
import CRCDashboard from './pages/crc/CRCDashboard';
import CRCTrials from './pages/crc/CRCTrials';
import CRCSettings from './pages/crc/CRCSettings'
import CRCMatchingHub from './pages/crc/CRCMatchingHub';
import CRCPatients from './pages/crc/CRCPatients'
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
        {/* Physician only routes */}
        <Route element={ <RequireAuth redirectTo='/physician-crc-login' allowedRoles={['practitioner']} />} >
          <Route path='/physician-dashboard' element={<PhysicianDashboard/>} />
          <Route path='/physician-settings' element={<PhysicianSettings/>} />
        </Route>
        {/* CRC only routes */}
        <Route element={ <RequireAuth redirectTo='/physician-crc-login' allowedRoles={['crc']} />} >
          <Route path='/crc-dashboard' element={<CRCDashboard/>} />
          <Route path='/crc-hub' element={<CRCMatchingHub/>} />
          <Route path='/crc-patients' element={<CRCPatients/>} />
          <Route path='/crc-settings' element={<CRCSettings/>} />
          <Route path='/crc-trials' element={<CRCTrials/>} />
        </Route>
      </Routes>
    </Router>
    </QueryClientProvider>
  )
}

export default App
