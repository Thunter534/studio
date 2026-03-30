/**
 * @fileOverview Activity Engine for ClassPulse.
 * Monitors and persists real teacher actions taken within the app.
 */

export type ActivityType = 'assessment_created' | 'assessment_finalized' | 'student_added' | 'draft_updated' | 'report_generated';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  updatedAt: string;
}

const STORAGE_KEY = 'athena_activity_history_v1';

// Seed data removed to only show real teacher actions.
const SEED_DATA: ActivityEntry[] = [];

export const activityTracker = {
  /**
   * Logs a new activity to the persistent store.
   */
  add: (type: ActivityType, title: string, subtitle: string) => {
    if (typeof window === 'undefined') return;
    
    const entries = activityTracker.get();
    const newEntry: ActivityEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      subtitle,
      updatedAt: new Date().toISOString(),
    };

    // Keep the last 5 entries as per user request for "5 of all time"
    const updated = [newEntry, ...entries].slice(0, 5);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    // Dispatch a custom event so the dashboard can refresh instantly
    window.dispatchEvent(new CustomEvent('athena_activity_updated'));
  },

  /**
   * Retrieves the activity history.
   */
  get: (): ActivityEntry[] => {
    if (typeof window === 'undefined') return [];
    
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_DATA;
    
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : SEED_DATA;
    } catch {
      return SEED_DATA;
    }
  },

  /**
   * Clears the history.
   */
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }
};
