import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, Home, Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function ProductLibraryHeader() {
  const { signOut, userProfile } = useAuth();

  return (
    <header className="bg-gradient-to-r from-orange-600 to-amber-600 border-b border-orange-700 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Product Library</h1>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <NavLink
                to="/platform"
                className="px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-orange-100 hover:bg-white/10 hover:text-white"
              >
                <Home className="w-4 h-4" />
                Home
              </NavLink>
              <NavLink
                to="/product-library"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                    isActive
                      ? 'bg-white text-orange-700'
                      : 'text-orange-100 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Package className="w-4 h-4" />
                Product Library
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-white">{userProfile?.email}</p>
              <p className="text-xs text-orange-100">
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
