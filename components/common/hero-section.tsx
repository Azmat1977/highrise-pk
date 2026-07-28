// File: components/common/hero-section.tsx

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import AdvancedSearch from './advanced-search';

export const HeroSection: React.FC = () => {
  return (
    <section
      className="relative h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/images/hero.jpg')" }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50 z-0"></div>

      {/* Centered Content */}
      <div className="relative z-10 h-full w-full flex flex-col justify-center items-center text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-white text-4xl md:text-5xl font-bold leading-snug md:leading-tight tracking-tight mb-4"
        >
          Discover Premium <br /> Properties Across Pakistan
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-white/80 text-base md:text-lg leading-relaxed tracking-normal max-w-2xl mb-8"
        >
          Buy, Rent, or Invest in Apartments, Plots, and Commercial Properties — all from one trusted platform.
        </motion.p>

        {/* Advanced Search in Center */}
        <div className="w-full px-4 sm:px-6 md:px-0 max-w-6xl">
          <AdvancedSearch />
        </div>
      </div>
    </section>
  );
};
