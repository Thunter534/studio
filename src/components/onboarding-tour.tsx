'use client';

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ChevronRight, ChevronLeft, LayoutDashboard, Users, FileText, Sparkles, PlusCircle, Database } from 'lucide-react';

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  targetId?: string;
}

const TOUR_CONFIG: Record<string, Step[]> = {
  '/teacher/dashboard': [
    {
      title: "Welcome to Athena",
      description: "Your academic command center has been upgraded. Let's explore your new streamlined workflow.",
      icon: <Sparkles className="h-6 w-6 text-primary" />,
    },
    {
      title: "Teacher Brief",
      description: "Monitor your key performance indicators and action items at a glance.",
      icon: <Database className="h-6 w-6 text-primary" />,
      targetId: "onboarding-kpis",
    },
    {
      title: "Grading Priority",
      description: "Manage your review queue here. Submissions appear as they arrive from your students.",
      icon: <FileText className="h-6 w-6 text-primary" />,
      targetId: "onboarding-review-queue",
    },
    {
      title: "Quick Actions",
      description: "Start new assignments or navigate your history with ease from any page.",
      icon: <PlusCircle className="h-6 w-6 text-primary" />,
      targetId: "onboarding-quick-actions",
    },
    {
      title: "Navigation Sidebar",
      description: "Quickly switch between Students, Assignments, and Reports. Athena features a premium Slate and Blue design system.",
      icon: <LayoutDashboard className="h-6 w-6 text-primary" />,
      targetId: "onboarding-sidebar",
    },
  ],
  '/teacher/students': [
    {
      title: "Student Roster",
      description: "The central directory for all student data. Search and find students instantly with live database queries.",
      icon: <Users className="h-6 w-6 text-primary" />,
      targetId: "onboarding-student-list",
    },
    {
      title: "Add New Student",
      description: "Enroll a new student manually or use the bulk import tools.",
      icon: <PlusCircle className="h-6 w-6 text-primary" />,
      targetId: "onboarding-add-student",
    }
  ],
  '/teacher/assessments': [
    {
      title: "Assignments Inbox",
      description: "Manage all current and past learning objectives here. Use the search bar to filter by assignment title.",
      icon: <FileText className="h-6 w-6 text-primary" />,
      targetId: "onboarding-assessment-list",
    },
    {
      title: "Create Assignment",
      description: "Launch a new assignment for your classroom with a single click.",
      icon: <Sparkles className="h-6 w-6 text-primary" />,
      targetId: "onboarding-new-assessment",
    }
  ]
};

export function OnboardingTour() {
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const steps = useMemo(() => TOUR_CONFIG[pathname] || [], [pathname]);
  const storageKey = `athena_tour_seen_${pathname.replace(/\//g, '_')}`;

  const updateSpotlight = useCallback(() => {
    if (!steps[currentStep]) return;
    const targetId = steps[currentStep].targetId;
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        setSpotlightRect(el.getBoundingClientRect());
        return;
      }
    }
    setSpotlightRect(null);
  }, [currentStep, steps]);

  useEffect(() => {
    if (steps.length === 0) return;
    
    const hasSeenTour = sessionStorage.getItem(storageKey);
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setCurrentStep(0);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [pathname, storageKey, steps.length]);

  useLayoutEffect(() => {
    if (isVisible) {
      updateSpotlight();
      window.addEventListener('resize', updateSpotlight);
      window.addEventListener('scroll', updateSpotlight);
      return () => {
        window.removeEventListener('resize', updateSpotlight);
        window.removeEventListener('scroll', updateSpotlight);
      };
    }
  }, [isVisible, currentStep, updateSpotlight]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeTour = () => {
    setIsVisible(false);
    sessionStorage.setItem(storageKey, 'true');
  };

  const getCardPosition = () => {
    const cardWidth = Math.min(360, (typeof window !== 'undefined' ? window.innerWidth : 400) - 48);
    const cardHeight = 240;
    const padding = 24;
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    if (!spotlightRect) {
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const
      };
    }

    const { top, bottom, left, right, width } = spotlightRect;
    
    let cardLeft = left + width / 2 - cardWidth / 2;
    let cardTop = bottom + padding;

    if (left < 300) {
      cardLeft = right + padding;
      cardTop = top;
    }
    else if (right > windowWidth - 300) {
      cardLeft = left - cardWidth - padding;
      cardTop = top;
    }
    else if (cardTop + cardHeight > windowHeight - padding) {
      cardTop = top - cardHeight - padding;
    }

    cardLeft = Math.max(padding, Math.min(cardLeft, windowWidth - cardWidth - padding));
    cardTop = Math.max(padding, Math.min(cardTop, windowHeight - cardHeight - padding));

    return {
      position: 'fixed' as const,
      top: cardTop,
      left: cardLeft,
      transform: 'none',
      zIndex: 110,
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    };
  };

  if (!isVisible || steps.length === 0) return null;

  const spotlightPadding = 4;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <motion.rect
                initial={false}
                animate={{
                  x: spotlightRect.left - spotlightPadding,
                  y: spotlightRect.top - spotlightPadding,
                  width: spotlightRect.width + (spotlightPadding * 2),
                  height: spotlightRect.height + (spotlightPadding * 2),
                  rx: 12,
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.65)"
          mask="url(#spotlight-mask)"
          className="backdrop-blur-[2px]"
        />
      </svg>

      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname + currentStep}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
            className="w-[calc(100vw-48px)] max-w-[360px] pointer-events-auto"
            style={getCardPosition()}
          >
            <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-none ring-1 ring-black/5 bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-4 pb-2 space-y-0 bg-secondary/50 dark:bg-slate-800/50">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-border dark:border-slate-700">
                  {steps[currentStep].icon}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-primary dark:text-primary/80 uppercase tracking-[0.15em] mb-0.5">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                  <CardTitle className="text-base font-bold text-foreground dark:text-slate-100 leading-tight">
                    {steps[currentStep].title}
                  </CardTitle>
                </div>
                <button 
                  onClick={completeTour}
                  className="p-1 hover:bg-secondary dark:hover:bg-slate-700 rounded-full transition-colors self-start"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-muted-foreground dark:text-slate-400 text-sm leading-relaxed">
                  {steps[currentStep].description}
                </p>
                
                <div className="flex gap-1 mt-6">
                  {steps.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1 rounded-full transition-all duration-500 ${
                        i === currentStep ? 'w-8 bg-primary' : 'w-1.5 bg-border dark:bg-slate-700'
                      }`} 
                    />
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between pt-2 border-t border-border/50 dark:border-slate-800">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={completeTour} 
                  className="text-muted-foreground hover:text-foreground text-xs font-semibold px-0 hover:bg-transparent"
                >
                  Skip
                </Button>
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleBack} 
                      className="h-8 border-border dark:border-slate-700 text-muted-foreground dark:text-slate-300 hover:bg-secondary text-xs font-bold"
                    >
                      <ChevronLeft className="mr-1 h-3 w-3" /> Back
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={handleNext} 
                    className="h-8 bg-primary hover:opacity-90 text-white text-xs font-bold px-4 shadow-md shadow-primary/20"
                  >
                    {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
