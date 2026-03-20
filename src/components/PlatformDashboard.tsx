import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, FileText, Package, Palette, BarChart3, Settings, Sparkles, Users, ArrowRight, UserCog, CircleUser as UserCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { PlatformHeader } from './PlatformHeader';
import ReportIssueButton from './ReportIssueButton';
import { DashboardAlerts } from './DashboardAlerts';
import { useAuth } from '../contexts/AuthContext';

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
  gradient: string;
}

export function PlatformDashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const coreModules: ModuleCard[] = [
    {
      id: 'expensepilot',
      title: 'ExpensePilot',
      description: 'Track expenses, scan invoices, and manage company spending',
      icon: <Receipt className="w-12 h-12" />,
      route: '/expensepilot',
      color: 'text-blue-600',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'sales-bills',
      title: 'Sales Bills',
      description: 'Generate invoices, manage sales, and track payments',
      icon: <FileText className="w-12 h-12" />,
      route: '/sales-bills',
      color: 'text-green-600',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      id: 'product-library',
      title: 'Product Library',
      description: 'Manage inventory, products, and stock levels',
      icon: <Package className="w-12 h-12" />,
      route: '/product-library',
      color: 'text-orange-600',
      gradient: 'from-orange-500 to-amber-600'
    },
    {
      id: 'creatives',
      title: 'Creatives',
      description: 'Design assets, marketing materials, and brand resources',
      icon: <Palette className="w-12 h-12" />,
      route: '/creatives',
      color: 'text-purple-600',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      id: 'crm',
      title: 'CRM',
      description: 'Manage leads, follow-ups, and customer relationships',
      icon: <Users className="w-12 h-12" />,
      route: '/crm',
      color: 'text-indigo-600',
      gradient: 'from-indigo-500 to-blue-600'
    },
    {
      id: 'astro-recommendation',
      title: 'Astro Recommendation',
      description: 'Generate personalized Rudraksha recommendations for customers',
      icon: <Sparkles className="w-12 h-12" />,
      route: '/astro-recommendation',
      color: 'text-amber-600',
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      id: 'reports',
      title: 'Reports',
      description: 'Analytics, insights, and business intelligence',
      icon: <BarChart3 className="w-12 h-12" />,
      route: '/platform-reports',
      color: 'text-cyan-600',
      gradient: 'from-cyan-500 to-blue-600'
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure platform, users, and preferences',
      icon: <Settings className="w-12 h-12" />,
      route: '/settings',
      color: 'text-slate-600',
      gradient: 'from-slate-500 to-slate-600'
    }
  ];

  const userModules: ModuleCard[] = [
    {
      id: 'my-profile',
      title: 'My Profile',
      description: 'Manage your personal information and settings',
      icon: <UserCircle className="w-12 h-12" />,
      route: '/my-profile',
      color: 'text-teal-600',
      gradient: 'from-teal-500 to-cyan-600'
    }
  ];

  const adminModules: ModuleCard[] = isAdmin ? [
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Manage team members, roles, and permissions',
      icon: <UserCog className="w-12 h-12" />,
      route: '/user-management',
      color: 'text-red-600',
      gradient: 'from-red-500 to-pink-600'
    },
    {
      id: 'system-reports',
      title: 'System Reports',
      description: 'Track bugs, improvements, and feature requests',
      icon: <AlertCircle className="w-12 h-12" />,
      route: '/system-reports',
      color: 'text-orange-600',
      gradient: 'from-orange-500 to-red-600'
    },
    {
      id: 'system-errors',
      title: 'System Errors',
      description: 'Monitor and resolve application errors',
      icon: <AlertTriangle className="w-12 h-12" />,
      route: '/system-errors',
      color: 'text-red-600',
      gradient: 'from-red-600 to-orange-600'
    }
  ] : [];

  const allModules = [...coreModules, ...userModules, ...adminModules];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <PlatformHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Welcome to Your Business Platform
          </h1>
          <p className="text-lg text-slate-600">
            Select a module to get started with managing your business
          </p>
        </div>

        <DashboardAlerts className="mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allModules.map((module) => (
            <button
              key={module.id}
              onClick={() => navigate(module.route)}
              className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-slate-200 transform hover:-translate-y-1"
            >
              <div className="p-8">
                <div className={`bg-gradient-to-br ${module.gradient} p-4 rounded-xl inline-block mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white">
                    {module.icon}
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {module.title}
                </h3>

                <p className="text-slate-600 mb-4 min-h-[3rem]">
                  {module.description}
                </p>

                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                  <span>Open Module</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div className={`h-2 bg-gradient-to-r ${module.gradient}`} />
            </button>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-xl shadow-md p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Quick Stats
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{allModules.length}</div>
              <div className="text-sm text-slate-600">Active Modules</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">100%</div>
              <div className="text-sm text-slate-600">System Status</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">Live</div>
              <div className="text-sm text-slate-600">Platform Status</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">Ready</div>
              <div className="text-sm text-slate-600">All Systems</div>
            </div>
          </div>
        </div>
      </main>
      <ReportIssueButton moduleName="Platform Dashboard" />
    </div>
  );
}
