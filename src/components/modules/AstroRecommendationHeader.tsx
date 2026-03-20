import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';

export function AstroRecommendationHeader() {
  return (
    <header className="bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <Link
              to="/platform"
              className="flex items-center gap-2 text-white hover:text-orange-100 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Platform</span>
            </Link>
            <div className="w-px h-8 bg-white/30"></div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur p-2 rounded-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Astro Recommendation</h1>
                <p className="text-xs text-orange-100">Generate personalized Rudraksha recommendations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
