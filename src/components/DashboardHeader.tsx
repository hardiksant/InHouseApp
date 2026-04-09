import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Home, ArrowLeft, LayoutDashboard, Receipt, ScanLine, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import logo from '../assets/expensepilot-logo.png';

export function DashboardHeader() {
  const { signOut, userProfile } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Back button on mobile */}
            <button
              onClick={() => navigate('/platform')}
              className="md:hidden flex items-center gap-1 text-gray-500 hover:text-gray-800 transition mr-1"
              aria-label="Back to platform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <img src={logo} alt="ExpensePilot" className="h-10" />

            <nav className="hidden md:flex items-center gap-1">
              <NavLink
                to="/platform"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Home className="w-4 h-4" />
                Home
              </NavLink>
              <NavLink
                to="/expensepilot/dashboard"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/expensepilot/expenses"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                Expenses
              </NavLink>
              <NavLink
                to="/expensepilot/viewer"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                Scanner
              </NavLink>
              <NavLink
                to="/expensepilot/reports"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                Reports
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{userProfile?.email}</p>
              <p className="text-xs text-gray-500">
                {userProfile?.role === 'admin' ? 'Administrator' : 'Employee'}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile tab navigation */}
      <div className="md:hidden border-t border-gray-200 bg-white">
        <nav className="flex">
          <NavLink
            to="/expensepilot/dashboard"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>
          <NavLink
            to="/expensepilot/expenses"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <Receipt className="w-5 h-5" />
            Expenses
          </NavLink>
          <NavLink
            to="/expensepilot/viewer"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <ScanLine className="w-5 h-5" />
            Scanner
          </NavLink>
          <NavLink
            to="/expensepilot/reports"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <BarChart3 className="w-5 h-5" />
            Reports
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
