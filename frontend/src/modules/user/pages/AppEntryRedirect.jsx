import React from 'react';
import { Navigate } from 'react-router-dom';
import { safeStorage } from '@/lib/safeStorage';

const HOME_BY_ROLE = {
  admin: '/admin/dashboard',
  vendor: '/vendor/dashboard',
  supplier: '/supplier/dashboard'
};

/**
 * Where the customer app starts. The splash ad (if any) is shown by
 * SplashAdGate on top of this, so here we only decide: signed in -> their
 * home, signed out -> the login page.
 */
export default function AppEntryRedirect() {
  const token = safeStorage.getItem('token');
  const role = (safeStorage.getItem('userRole') || 'customer').toLowerCase();
  const target = token ? (HOME_BY_ROLE[role] || '/user/home') : '/user/auth';
  return <Navigate to={target} replace />;
}
