import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { ExpensesList } from './ExpensesList';
import { Reports } from './Reports';
import { ExpenseViewer } from './ExpenseViewer';

export function ExpensePilotModule() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/expenses" element={<ExpensesList />} />
      <Route path="/viewer" element={<ExpenseViewer />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="*" element={<Navigate to="/expensepilot" replace />} />
    </Routes>
  );
}
