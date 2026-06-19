import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import LiveStats from '@/components/LiveStats';
import FeatureShowcase from '@/components/FeatureShowcase';
import GlobalLeaderboard from '@/components/GlobalLeaderboard';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <LiveStats />
        <FeatureShowcase />
        <GlobalLeaderboard />
      </main>
      <Footer />
    </>
  );
}
