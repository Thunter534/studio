import type { WebhookRequest, WebhookResponse } from './events';

export interface LogEntry {
  id: string;
  timestamp: string;
  eventName: string;
  request: WebhookRequest;
  response: WebhookResponse;
  status: 'success' | 'error';
  correlationId: string;
}

const MAX_LOG_ENTRIES = 50;
let logs: LogEntry[] = [];

// This logger is for development debugging ONLY.
// It is not persisted and will be cleared on server restart.

export const devLogger = {
  log: (entry: Omit<LogEntry, 'id'>) => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    const newEntry = { ...entry, id: crypto.randomUUID() };
    logs = [newEntry, ...logs].slice(0, MAX_LOG_ENTRIES);
  },

  getLogs: (): LogEntry[] => {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    return logs;
  },

  clear: () => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    logs = [];
  },
};
