import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, HardDrive, ShieldAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: unknown): State {
    let msg = 'An unexpected runtime exception occurred.';
    
    // Safely extract message without triggering cross-origin window object property inspection
    if (error && typeof error === 'object') {
      try {
        const errObj = error as Record<string, unknown>;
        if (typeof errObj.message === 'string') {
          msg = errObj.message;
        } else if (typeof errObj.name === 'string') {
          msg = errObj.name;
        } else {
          msg = String(error);
        }
      } catch {
        msg = 'Runtime component exception';
      }
    } else if (typeof error === 'string') {
      msg = error;
    }

    // Ignore cross-origin iframe security errors or React scheduler re-entrancy noise
    if (
      msg.includes('Blocked a frame with origin') ||
      msg.includes('cross-origin frame') ||
      msg.includes('$$typeof') ||
      msg.includes('Should not already be working')
    ) {
      return { hasError: false, errorMessage: '' };
    }

    return { hasError: true, errorMessage: msg };
  }

  public override componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    // Check if error is a cross-origin security error from iframe wrapper
    const errStr = String(error || '');
    if (
      errStr.includes('Blocked a frame with origin') ||
      errStr.includes('cross-origin frame') ||
      errStr.includes('$$typeof') ||
      errStr.includes('Should not already be working')
    ) {
      // Clear error state and allow application to keep running smoothly
      this.setState({ hasError: false, errorMessage: '' });
      return;
    }

    console.warn('Gossip Component Isolator caught error:', errorInfo.componentStack);
  }

  private handleSoftReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  private handleClearCacheAndReset = () => {
    if (window.confirm('Clear temporary local cache to repair state? Your account and messages in IndexedDB backup will stay safe.')) {
      try {
        sessionStorage.clear();
        const activeUser = localStorage.getItem('gossip_offline_active_user') || localStorage.getItem('convo_offline_active_user');
        const token = localStorage.getItem('gossip_token') || localStorage.getItem('convo_token');
        localStorage.clear();
        if (activeUser) localStorage.setItem('gossip_offline_active_user', activeUser);
        if (token) localStorage.setItem('gossip_token', token);
      } catch (e) {
        console.error('Failed clearing storage:', e);
      }
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#090b10] flex items-center justify-center p-4 font-sans text-white">
          <div className="max-w-md w-full bg-[#0f121a] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-400 font-mono text-sm font-bold border-b border-red-500/20 pb-3">
              <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
              <span>GOSSIP RECOVERY SYSTEM</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-bold font-mono text-white flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Runtime Shield Activated</span>
              </h2>
              <p className="text-xs text-white/70 font-mono leading-relaxed">
                An unexpected exception occurred. To protect your encryption keys and local chat database, the Gossip Safety Engine isolated the view.
              </p>
            </div>

            {this.state.errorMessage && (
              <div className="p-3 bg-black/60 border border-white/10 rounded-xl text-[11px] font-mono text-red-300/90 overflow-x-auto max-h-32">
                {this.state.errorMessage}
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={this.handleSoftReload}
                className="flex-1 py-2.5 px-3 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-bold font-mono text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-[0_0_15px_rgba(0,229,255,0.25)]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>RELOAD APP</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReset}
                className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white font-mono text-xs rounded-xl flex items-center justify-center space-x-2 transition-all border border-white/10"
              >
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>REPAIR STATE</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
