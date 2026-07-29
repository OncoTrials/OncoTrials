import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RequireAuth } from './utils/Auth';
import HomePage from './pages/HomePage';
import PhysicianCRCRegisterPage from './pages/auth/PhysicianCRCRegisterPage';
import PhysicianCRCLoginPage from './pages/auth/PhysicianCRCLoginPage';
import ForgotPassword from './pages/auth/ForgotPassword';
import PatientDashboard from './pages/Patient/PatientDashboard';
import ChangePassword from './pages/auth/ChangePassword';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthCallback from './pages/auth/AuthCallback';
import PhysicianDashboard from './pages/Physician/PhysicianDashboard';
import PhysicianSettings from './pages/Physician/PhysicianSettings';
import CRCDashboard from './pages/crc/CRCDashboard';
import CRCTrials from './pages/crc/CRCTrials';
import CRCSettings from './pages/crc/CRCSettings'
import CRCMatchingHub from './pages/crc/CRCMatchingHub';
import CRCPatients from './pages/crc/CRCPatients'
import './App.css'
import InputTrials from './components/shared/InputTrials';
import PrivacyPolicy from './pages/PrivacyPolicy';
import EpicLaunchLanding from './pages/epic/EpicLaunchLanding';
import MatchResults from './pages/epic/MatchResults';

export const queryClient = new QueryClient();

function App() {

  return (
    <>
   
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path='/' element={<HomePage />} />
          {/* <Route path='/patient-login' element={<PatientLoginPage />} />
          <Route path='/patient-register' element={<PatientRegister />} /> */}
          <Route path='/physician-register' element={<PhysicianCRCRegisterPage />} />
          <Route path='/physician-login' element={<PhysicianCRCLoginPage />} />
          <Route path='/forgot-password' element={<ForgotPassword />} />
          <Route path='/change-password' element={<ChangePassword />} />
          <Route path='/auth/callback' element={<AuthCallback />} />
          {/* SMART on FHIR landing + results — no app auth required, the SMART JWT carries auth */}
          <Route path='/epic/launched' element={<EpicLaunchLanding />} />
          <Route path='/match/:requestId' element={<MatchResults />} />
          <Route path='/trials' element={<PatientDashboard />} />
          <Route path='/privacy-policy' element={<PrivacyPolicy/>} />
          {/* Physician only routes */}
          <Route element={<RequireAuth redirectTo='/physician-login' allowedRoles={['practitioner']} />} >
            <Route path='/physician-input-trials' element={<InputTrials />} />
            <Route path='/physician-dashboard' element={<PhysicianDashboard />} />
            <Route path='/physician-settings' element={<PhysicianSettings />} />
          </Route>
          {/* CRC only routes */}
          <Route element={<RequireAuth redirectTo='/physician-crc-login' allowedRoles={['crc']} />} >
            <Route path='/crc-dashboard' element={<CRCDashboard />} />
            <Route path='/crc-hub' element={<CRCMatchingHub />} />
            <Route path='/crc-patients' element={<CRCPatients />} />
            <Route path='/crc-settings' element={<CRCSettings />} />
            <Route path='/crc-trials' element={<CRCTrials />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
    </>
  )
}

export default App
