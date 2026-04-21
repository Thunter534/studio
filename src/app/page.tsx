'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Moon, Sun } from 'lucide-react';
import type { UserRole } from '@/lib/auth';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Brand component: ATHENA with logo font.
 * Signature subtext: "by ClassPulse"
 */
function AthenaBrand({ isSmall = false, isCentered = false }: { isSmall?: boolean; isCentered?: boolean }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("flex flex-col", isCentered ? "items-center text-center" : "items-start")}
    >
      <motion.span
        variants={itemVariants}
        className={cn(
          isSmall ? 'text-lg' : isCentered ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl',
          "font-extrabold text-primary tracking-tight leading-none font-logo uppercase"
        )}
      >
        ATHENA
      </motion.span>
      <motion.span
        variants={itemVariants}
        className={cn(
          "text-slate-400 font-bold mt-1 font-sans tracking-[0.1em]",
          isSmall ? 'text-[8px]' : isCentered ? 'text-[10px] md:text-xs' : 'text-[9px] md:text-[10px]'
        )}
      >
        by ClassPulse
      </motion.span>
    </motion.div>
  );
}

export default function AthenaLandingPage() {
  const [role, setRole] = useState<UserRole>('teacher');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { login, skipLogin } = useAuth();
  const vantaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Show splash for 2.2 seconds then reveal page
    const timer = setTimeout(() => setIsIntroComplete(true), 2200);
    
    // Initial theme check
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
    
    return () => clearTimeout(timer);
  }, []);

  // Vanta Topology Effect
  useEffect(() => {
    if (!isIntroComplete) return;

    let vantaEffect: any;
    const loadVantaScripts = async () => {
      // Inject p5.js
      if (!(window as any).p5) {
        const p5Script = document.createElement('script');
        p5Script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.min.js';
        p5Script.async = true;
        document.body.appendChild(p5Script);
        await new Promise((resolve) => p5Script.onload = resolve);
      }

      // Inject Vanta Topology
      if (!(window as any).VANTA || !(window as any).VANTA.TOPOLOGY) {
        const vantaScript = document.createElement('script');
        vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.topology.min.js';
        vantaScript.async = true;
        document.body.appendChild(vantaScript);
        await new Promise((resolve) => vantaScript.onload = resolve);
      }

      if (vantaRef.current && (window as any).VANTA?.TOPOLOGY) {
        vantaEffect = (window as any).VANTA.TOPOLOGY({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          backgroundColor: 0x222222,
          color: 0x89964e
        });
      }
    };

    loadVantaScripts();

    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [isIntroComplete]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    localStorage.setItem('athena-theme', newTheme);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsError(false);
    try {
      await login(role);
    } catch {
      setIsError(true);
      setIsLoading(false);
    }
  };

  const toggleRole = (newRole: UserRole) => {
    if (newRole === role) return;
    setRole(newRole);
    setIsError(false);
  };

  // Animation variants for the card error state (the wobble)
  const cardVariants = {
    error: {
      x: [0, -8, 8, -8, 8, 0],
      transition: {
        duration: 0.4,
        ease: "linear"
      }
    },
    idle: {
      x: 0
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-secondary dark:bg-[#0F172A] p-4 md:p-8 font-sans overflow-hidden relative">
      
      {/* Absolute Theme Toggle for Entry */}
      <div className="absolute top-6 right-6 md:top-10 md:right-10 z-[60]">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:bg-white/10 rounded-full h-10 w-10 shadow-sm border border-border bg-white dark:bg-[#111827]"
          onClick={toggleTheme}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {!isIntroComplete ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-[#0F172A]"
          >
            <AthenaBrand isCentered />
          </motion.div>
        ) : (
          <motion.div
            key="main-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl overflow-hidden grid lg:grid-cols-2 max-w-[1400px] w-full min-h-[750px] border border-border"
          >
            {/* Left Column: Value Proposition */}
            <div className="pt-10 md:pt-16 px-10 md:px-16 pb-10 md:px-16 flex flex-col justify-between bg-white dark:bg-[#111827]">
              <div className="space-y-8">
                <AthenaBrand />

                <div className="space-y-4">
                  <h1 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
                    Smarter grading starts here.
                  </h1>
                  <p className="text-muted-foreground max-w-lg text-base leading-relaxed font-normal">
                    Athena helps {role === 'teacher' ? 'teachers' : 'parents'} {role === 'teacher' ? 'grade faster, track student progress,' : 'track their child\'s progress'} and gain insights from classroom data.
                  </p>

                  <ul className="space-y-3 pt-4">
                    {[
                      role === 'teacher' ? "AI-assisted grading" : "Real-time grade updates",
                      role === 'teacher' ? "Student progress insights" : "Performance trends",
                      role === 'teacher' ? "Simple classroom management" : "Direct teacher communication"
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-foreground text-base font-medium">
                        <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <Check className="text-primary h-3 w-3 stroke-[3]" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Image Container - Stabilized with fixed aspect ratio */}
              <div className="relative aspect-[16/8] w-full mt-8 overflow-hidden rounded-2xl">
                <Image
                  src="/images/athena-classroom.png"
                  alt="Athena classroom"
                  fill
                  className="object-cover object-center scale-[1.3] translate-y-[30px]"
                  priority
                />
              </div>
            </div>

            {/* Right Column: Login Card Area */}
            <div className="bg-secondary dark:bg-[#0F172A] p-8 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
              
              {/* Vanta Topology Background Layer */}
              <div ref={vantaRef} className="absolute inset-0 z-0 opacity-100 dark:opacity-80" />
              
              {/* Role Switcher Pill */}
              <div className="absolute top-12 flex bg-white dark:bg-[#111827] p-1 rounded-full shadow-sm border border-border z-10">
                <button
                  onClick={() => toggleRole('teacher')}
                  className={cn(
                    "px-5 py-1.5 rounded-full text-xs font-bold transition-all",
                    role === 'teacher' ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Teacher
                </button>
                <button
                  onClick={() => toggleRole('parent')}
                  className={cn(
                    "px-5 py-1.5 rounded-full text-xs font-bold transition-all",
                    role === 'parent' ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Parent
                </button>
              </div>

              <motion.div 
                variants={cardVariants}
                animate={isError ? "error" : "idle"}
                className="w-full max-w-[380px] space-y-4 mt-12 relative z-10"
              >
                <div className="bg-white dark:bg-[#111827] p-6 rounded-[2rem] shadow-lg border border-border flex flex-col h-fit">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={role}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="flex-1 flex flex-col"
                    >
                      <div className="text-center mb-2">
                        <h2 className="text-xl font-bold text-foreground tracking-tight uppercase">
                          Sign In
                        </h2>
                      </div>

                      <form onSubmit={handleLogin} className="space-y-2.5 flex-1 flex flex-col">
                        {isError && (
                          <p className="text-[10px] font-medium text-destructive text-center">
                            Could not start secure sign-in. Please check Cognito configuration.
                          </p>
                        )}

                        <p className="text-[11px] text-muted-foreground text-center font-bold uppercase tracking-wider">
                          Your AI-assisted grading workspace
                        </p>

                        <Button 
                          type="submit" 
                          disabled={isLoading}
                          className="w-full bg-primary hover:opacity-90 h-12 text-base font-bold rounded-xl transition-all shadow-sm relative overflow-hidden group"
                        >
                          {/* Shimmer Wave Animation */}
                          <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-2000 ease-in-out pointer-events-none" />
                          
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign In"}
                          </span>
                        </Button>

                        <div className="relative py-0.5">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border"></span>
                          </div>
                          <div className="relative flex justify-center text-[9px]">
                            <span className="bg-white dark:bg-[#111827] px-4 text-muted-foreground font-bold uppercase tracking-wider">Or</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Button variant="outline" type="button" className="w-full h-11 rounded-xl border-border hover:bg-muted flex items-center justify-center gap-3 font-semibold text-muted-foreground shadow-sm text-sm">
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                          </Button>

                          <Button variant="outline" type="button" className="w-full h-11 rounded-xl border-border hover:bg-muted flex items-center justify-center gap-3 font-semibold text-muted-foreground shadow-sm text-sm">
                            <svg className="h-4 w-4" viewBox="0 0 23 23">
                              <path fill="#f35325" d="M1 1h10v10H1z"/>
                              <path fill="#81bc06" d="M12 1h10v10H12z"/>
                              <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                              <path fill="#ffba08" d="M12 12h10v10H12z"/>
                            </svg>
                            Continue with Microsoft
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <footer className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                  <span>© 2026 ATHENA | </span>
                  <button className="hover:text-foreground transition-colors">Privacy</button> | 
                  <button className="hover:text-foreground transition-colors"> Terms</button>
                </footer>

                {/* Developer Shortcuts */}
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button 
                    onClick={() => skipLogin('teacher')}
                    className="px-3 py-1 rounded-full border border-slate-300 dark:border-slate-700 text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Dev: Teacher
                  </button>
                  <button 
                    onClick={() => skipLogin('parent')}
                    className="px-3 py-1 rounded-full border border-slate-300 dark:border-slate-700 text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Dev: Parent
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
