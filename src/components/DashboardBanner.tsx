import React from 'react';
import { TrendingUp, DollarSign, PieChart, BarChart3 } from 'lucide-react';

export function DashboardBanner() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div className="relative w-full overflow-hidden rounded-2xl shadow-lg bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-8">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">ExpensePilot Dashboard</h2>
            <p className="text-blue-100 text-lg">Track, manage, and optimize your expenses</p>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
              <PieChart className="w-8 h-8 text-white" />
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32"></div>
      </div>
    </div>
  );
}
