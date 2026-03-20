import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, Home, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function SettingsHeader() {
  const { signOut, userProfile } = useAuth();

  return (
    <header className="bg-gradient-to-r from-slate-700 to-slate-800 border-b border-slate-900 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <SettingsIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Settings</h1>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <NavLink
                to="/platform"
                className="px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <Home className="w-4 h-4" />
                Home
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                    isActive
                      ? 'bg-white text-slate-800'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <SettingsIcon className="w-4 h-4" />
                Settings
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-white">{userProfile?.email}</p>
              <p className="text-xs text-slate-300">
                {userProfile?.role === 'admin' ? 'Administrator' : 'Employee'}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
