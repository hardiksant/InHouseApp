import React from 'react';
import { Users } from 'lucide-react';

export function UserManagementHeader() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg mb-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-white/20 rounded-lg">
          <Users className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-blue-100">Manage team members and access control</p>
        </div>
      </div>
    </div>
  );
}
