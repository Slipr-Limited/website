/**
 * App.jsx — Root application shell.
 * Handles lazy-loaded routing with AnimatePresence page transitions,
 * global scroll progress bar, and persistent Navbar/Footer.
 */
import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import styled, { createGlobalStyle } from 'styled-components';
import { colors, fonts, transitions } from './theme';
import Navbar from './components/shared/Navbar';
import Footer from './components/shared/Footer';
import ScrollToTop from './components/shared/ScrollToTop';

// Global style reset + font injection
const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: ${colors.background};
    color: ${colors.text.primary};
    font-family: ${fonts.primary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }
  ::selection { background: ${colors.accentLight}; color: ${colors.accent}; }
  :focus-visible {
    outline: 2px solid ${colors.accent};
    outline-offset: 3px;
    border-radius: 4px;
  }
  a { color: inherit; text-decoration: none; }
  img { max-width: 100%; display: block; }
`;

// Scroll progress bar at top of viewport
const ProgressBar = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${colors.accent};
  transform-origin: left;
  z-index: 9999;
`;

// Lazy-loaded pages
const Home = lazy(() => import('./pages/Home'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const ForTipsters = lazy(() => import('./pages/ForTipsters'));
const ForBuyers = lazy(() => import('./pages/ForBuyers'));
const Pricing = lazy(() => import('./pages/Pricing'));
const About = lazy(() => import('./pages/About'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Blog = lazy(() => import('./pages/Blog'));
const Contact = lazy(() => import('./pages/Contact'));
const Legal = lazy(() => import('./pages/Legal'));

// Admin panel: its own shell, styles and bundle. Never shows the marketing navbar or footer.
const AdminApp = lazy(() => import('./admin/AdminApp'));

// Page transition wrapper
const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.32, ease: transitions.easing }}
  >
    {children}
  </motion.div>
);

// Suspense fallback — minimal loading indicator
const PageLoader = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.background};
  &::after {
    content: '';
    width: 40px;
    height: 40px;
    border: 3px solid ${colors.surface};
    border-top-color: ${colors.accent};
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export default function App() {
  const location = useLocation();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });

  if (location.pathname === '/admin' || location.pathname.startsWith('/admin/')) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AdminApp />
      </Suspense>
    );
  }

  return (
    <>
      <GlobalStyle />
      <ProgressBar style={{ scaleX }} />
      <ScrollToTop />
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/how-it-works" element={<PageWrapper><HowItWorks /></PageWrapper>} />
            <Route path="/tipsters" element={<PageWrapper><ForTipsters /></PageWrapper>} />
            <Route path="/buyers" element={<PageWrapper><ForBuyers /></PageWrapper>} />
            <Route path="/pricing" element={<PageWrapper><Pricing /></PageWrapper>} />
            <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
            <Route path="/faq" element={<PageWrapper><FAQ /></PageWrapper>} />
            <Route path="/blog" element={<PageWrapper><Blog /></PageWrapper>} />
            <Route path="/contact" element={<PageWrapper><Contact /></PageWrapper>} />
            <Route path="/legal" element={<PageWrapper><Legal /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      <Footer />
    </>
  );
}
