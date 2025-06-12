import { useState } from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import HomePage from './pages/HomePage';
import PatientLoginPage from './pages/Patient/PatientLoginPage';
import PatientRegster from './pages/Patient/PatientRegster';
import PhysicianCRCRegisterPage from './pages/PhysicianCRCRegisterPage';
import PhysicianCRCLoginPage from './pages/PhysicianCRCLoginPage';
import './App.css'

function App() {

  return (
    <>
    <Router>
      <Routes>
        <Route path='/' element={<HomePage/>} />
        <Route path='/patient-login' element={<PatientLoginPage/>} />
        <Route path='/patient-register' element={<PatientRegster/>} />
        <Route path='/physician-crc-register' element={<PhysicianCRCRegisterPage/>} />
        <Route path='/physician-crc-login' element={<PhysicianCRCLoginPage/>} />
      </Routes>
    </Router>
    </>
  )
}

export default App
