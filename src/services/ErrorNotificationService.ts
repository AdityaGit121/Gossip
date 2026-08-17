/**
 * Architecture-Wide Error Notification & Diagnostic Log Collector
 * Catches Network, Communication, Storage, and Cryptography issues across all app layers.
 */

export type ErrorCategory = 'network' | 'communication' | 'storage' | 'crypto' | 'system';

export interface SystemErrorEvent {
  id: string;
  category: ErrorCategory;
  title: string;
  message: string;
  timestamp: string;
  fatal?: boolean;
}

type ErrorListener = (event: SystemErrorEvent) => void;

class ErrorNotificationServiceClass {
  private listeners: Set<ErrorListener> = new Set();
  private errorLog: SystemErrorEvent[] = [];
  private lastReported: Record<string, number> = {};

  public subscribe(listener: ErrorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(category: ErrorCategory, title: string, message: string, fatal = false): void {
    // Throttle identical error messages within 4 seconds to avoid toast spam
    const key = `${category}:${title}:${message}`;
    const now = Date.now();
    if (this.lastReported[key] && now - this.lastReported[key] < 4000) {
      return;
    }
    this.lastReported[key] = now;

    const event: SystemErrorEvent = {
      id: 'err_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      category,
      title,
      message,
      timestamp: new Date().toISOString(),
      fatal,
    };

    // Keep up to 50 recent errors for Application Analyzer inspection
    this.errorLog.unshift(event);
    if (this.errorLog.length > 50) {
      this.errorLog.pop();
    }

    // Broadcast to UI listeners
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in error notification listener:', err);
      }
    });
  }

  public notifyNetworkError(message: string): void {
    this.notify('network', 'NETWORK ESTABLISHMENT ISSUE', message);
  }

  public notifyCommError(message: string): void {
    this.notify('communication', 'REALTIME COMMUNICATION ISSUE', message);
  }

  public notifyStorageError(message: string): void {
    this.notify('storage', 'LOCAL STORAGE / DATABASE ISSUE', message);
  }

  public notifyCryptoError(message: string): void {
    this.notify('crypto', 'CRYPTOGRAPHY / KEY FAILURE', message);
  }

  public getRecentErrors(): SystemErrorEvent[] {
    return [...this.errorLog];
  }

  public clearLog(): void {
    this.errorLog = [];
  }
}

export const ErrorNotificationService = new ErrorNotificationServiceClass();
