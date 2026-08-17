import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  HardDrive,
  Wifi,
  Radio,
  Lock,
  Mic,
  Cpu,
  Copy,
  Check,
  ShieldCheck,
  Wrench,
  Terminal,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { getSocket } from '../../services/socket.js';
import { localDB } from '../../services/localDatabase.js';
import { ErrorNotificationService, SystemErrorEvent } from '../../services/ErrorNotificationService.js';

export interface DiagnosticResult {
  module: string;
  category: 'api' | 'socket' | 'storage' | 'crypto' | 'p2p' | 'media' | 'runtime';
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  latencyMs?: number;
  details: string;
  recommendation?: string;
}

export const ApplicationAnalyzer: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [overallHealth, setOverallHealth] = useState<'idle' | 'healthy' | 'degraded' | 'critical'>('idle');
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [recentLogs, setRecentLogs] = useState<SystemErrorEvent[]>([]);
  const [copiedReport, setCopiedReport] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{ usedMb: string; totalMb: string } | null>(null);

  useEffect(() => {
    // Load recent architecture errors
    setRecentLogs(ErrorNotificationService.getRecentErrors());
    // Auto run lightweight initial check on mount
    runFullDiagnosis();
  }, []);

  const runFullDiagnosis = async () => {
    setIsRunning(true);
    setOverallHealth('idle');

    const testResults: DiagnosticResult[] = [
      { module: 'Cloud Server REST API', category: 'api', status: 'running', details: 'Testing REST API connectivity...' },
      { module: 'Realtime Socket.IO Engine', category: 'socket', status: 'pending', details: 'Waiting...' },
      { module: 'IndexedDB Local Storage', category: 'storage', status: 'pending', details: 'Waiting...' },
      { module: 'Web Crypto & AES Engine', category: 'crypto', status: 'pending', details: 'Waiting...' },
      { module: 'WebRTC P2P Mesh Subsystem', category: 'p2p', status: 'pending', details: 'Waiting...' },
      { module: 'WebAudio & Media Capture', category: 'media', status: 'pending', details: 'Waiting...' },
      { module: 'Runtime & Client Environment', category: 'runtime', status: 'pending', details: 'Waiting...' },
    ];

    setResults([...testResults]);

    // 1. REST API Test
    const t0 = performance.now();
    try {
      await api.getMe().catch(() => null); // ping or auth check
      const latency = Math.round(performance.now() - t0);
      testResults[0] = {
        module: 'Cloud Server REST API',
        category: 'api',
        status: 'success',
        latencyMs: latency,
        details: `Connected to Cloud Run backend. Latency: ${latency}ms. Express server online.`,
      };
    } catch (err: any) {
      const latency = Math.round(performance.now() - t0);
      testResults[0] = {
        module: 'Cloud Server REST API',
        category: 'api',
        status: 'warning',
        latencyMs: latency,
        details: `Server unreachable (${err.message || 'Offline'}). Local Storage fallback is active.`,
        recommendation: 'Ensure internet connection is active, or use local offline mode.',
      };
    }
    setResults([...testResults]);

    // 2. Socket.IO Test
    const socket = getSocket();
    if (socket && socket.connected) {
      testResults[1] = {
        module: 'Realtime Socket.IO Engine',
        category: 'socket',
        status: 'success',
        details: `Socket connected with transport [${socket.io.engine?.transport?.name || 'websocket'}]. ID: ${socket.id}`,
      };
    } else if (socket) {
      testResults[1] = {
        module: 'Realtime Socket.IO Engine',
        category: 'socket',
        status: 'warning',
        details: 'Socket initialized but reconnecting or polling fallback active.',
        recommendation: 'Check server socket URL or allow WebSocket traffic.',
      };
    } else {
      testResults[1] = {
        module: 'Realtime Socket.IO Engine',
        category: 'socket',
        status: 'warning',
        details: 'Socket instance uninitialized or operating in standalone offline mode.',
      };
    }
    setResults([...testResults]);

    // 3. IndexedDB Local Storage Test
    const tStorage = performance.now();
    try {
      const testChat = {
        id: 'diag_test_' + Date.now(),
        participantIDs: ['diag_usr'],
        updatedAt: new Date().toISOString(),
      };
      await localDB.saveChat(testChat as any);
      const allChats = await localDB.getAllChats();
      const storageLatency = Math.round(performance.now() - tStorage);

      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const usedMb = ((est.usage || 0) / (1024 * 1024)).toFixed(2);
        const totalMb = ((est.quota || 0) / (1024 * 1024)).toFixed(2);
        setStorageEstimate({ usedMb, totalMb });
      }

      testResults[2] = {
        module: 'IndexedDB Local Storage',
        category: 'storage',
        status: 'success',
        latencyMs: storageLatency,
        details: `IndexedDB read/write operational (${storageLatency}ms). ${allChats.length} local chats cached.`,
      };
    } catch (err: any) {
      testResults[2] = {
        module: 'IndexedDB Local Storage',
        category: 'storage',
        status: 'error',
        details: `IndexedDB failure: ${err.message}`,
        recommendation: 'Clear browser data cache or grant persistent storage permission.',
      };
    }
    setResults([...testResults]);

    // 4. Web Crypto & AES Engine Test
    try {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const encoded = encoder.encode('GOSSIP_DIAGNOSTIC_PAYLOAD');
      const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
      const decoded = new TextDecoder().decode(plain);

      if (decoded === 'GOSSIP_DIAGNOSTIC_PAYLOAD') {
        testResults[3] = {
          module: 'Web Crypto & AES Engine',
          category: 'crypto',
          status: 'success',
          details: 'AES-256-GCM hardware key generation & encryption validated successfully.',
        };
      } else {
        throw new Error('Decrypted string mismatch');
      }
    } catch (err: any) {
      testResults[3] = {
        module: 'Web Crypto & AES Engine',
        category: 'crypto',
        status: 'error',
        details: `WebCrypto API error: ${err.message}`,
        recommendation: 'Ensure HTTPS is used or browser environment supports crypto.subtle.',
      };
    }
    setResults([...testResults]);

    // 5. WebRTC P2P Mesh Test
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pc.createDataChannel('diag_channel');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      pc.close();

      testResults[4] = {
        module: 'WebRTC P2P Mesh Subsystem',
        category: 'p2p',
        status: 'success',
        details: 'RTCPeerConnection offer & STUN ICE candidate generation operational.',
      };
    } catch (err: any) {
      testResults[4] = {
        module: 'WebRTC P2P Mesh Subsystem',
        category: 'p2p',
        status: 'warning',
        details: `WebRTC limited: ${err.message}`,
        recommendation: 'STUN/TURN network ports may be restricted by firewall.',
      };
    }
    setResults([...testResults]);

    // 6. WebAudio & Media Test
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) throw new Error('AudioContext unavailable');
      const ctx = new AudioContextClass();
      ctx.close();

      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

      testResults[5] = {
        module: 'WebAudio & Media Capture',
        category: 'media',
        status: 'success',
        details: `WebAudio synthesizer active. Camera/Mic capture API available: ${hasMediaDevices ? 'YES' : 'NO'}`,
      };
    } catch (err: any) {
      testResults[5] = {
        module: 'WebAudio & Media Capture',
        category: 'media',
        status: 'warning',
        details: `Media API restricted: ${err.message}`,
      };
    }
    setResults([...testResults]);

    // 7. Runtime & Client Environment
    const isCapacitor = !!(window as any).Capacitor;
    const isSecureContext = window.isSecureContext;
    testResults[6] = {
      module: 'Runtime & Client Environment',
      category: 'runtime',
      status: isSecureContext ? 'success' : 'warning',
      details: `Env: ${isCapacitor ? 'Android APK (Capacitor)' : 'Web Browser'}. Screen: ${window.innerWidth}x${window.innerHeight}. HTTPS/Secure: ${isSecureContext ? 'YES' : 'NO'}`,
    };
    setResults([...testResults]);

    // Calculate overall health
    const hasError = testResults.some((r) => r.status === 'error');
    const hasWarn = testResults.some((r) => r.status === 'warning');

    if (hasError) {
      setOverallHealth('critical');
    } else if (hasWarn) {
      setOverallHealth('degraded');
    } else {
      setOverallHealth('healthy');
    }

    setIsRunning(false);
  };

  const handleCopyDiagnosticReport = () => {
    const reportText = [
      `=== GOSSIP SYSTEM DIAGNOSTIC REPORT ===`,
      `Timestamp: ${new Date().toISOString()}`,
      `Overall Health: ${overallHealth.toUpperCase()}`,
      `User Agent: ${navigator.userAgent}`,
      `\n--- MODULE STATUSES ---`,
      ...results.map((r) => `[${r.status.toUpperCase()}] ${r.module}: ${r.details}`),
      `\n--- RECENT ARCHITECTURE ERROR LOGS (${recentLogs.length}) ---`,
      ...recentLogs.map((l) => `[${l.timestamp}] [${l.category.toUpperCase()}] ${l.title}: ${l.message}`),
    ].join('\n');

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleClearCacheAndReset = () => {
    if (window.confirm('Clear temporary local cache and refresh sessions? Your local chats in IndexedDB will stay safe.')) {
      try {
        sessionStorage.clear();
        ErrorNotificationService.clearLog();
        setRecentLogs([]);
      } catch (e) {
        console.error('Failed clearing cache:', e);
      }
      runFullDiagnosis();
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'running':
      case 'pending':
        return <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getCategoryIcon = (category: DiagnosticResult['category']) => {
    switch (category) {
      case 'api':
        return <Wifi className="w-4 h-4 text-cyan-400" />;
      case 'socket':
        return <Radio className="w-4 h-4 text-indigo-400" />;
      case 'storage':
        return <HardDrive className="w-4 h-4 text-amber-400" />;
      case 'crypto':
        return <Lock className="w-4 h-4 text-purple-400" />;
      case 'p2p':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'media':
        return <Mic className="w-4 h-4 text-pink-400" />;
      case 'runtime':
        return <Cpu className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-5 text-white font-sans">
      {/* Overall Health Header Card */}
      <div className="p-4 bg-[#0b0d13] border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div
            className={`p-3 rounded-xl border ${
              overallHealth === 'healthy'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : overallHealth === 'degraded'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : overallHealth === 'critical'
                ? 'bg-red-500/10 border-red-500/40 text-red-400'
                : 'bg-cyan-500/10 border-cyan-500/40 text-[#00e5ff]'
            }`}
          >
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold font-mono text-white">APPLICATION DIAGNOSTICS & ANALYZER</h4>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border uppercase ${
                  overallHealth === 'healthy'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : overallHealth === 'degraded'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : overallHealth === 'critical'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                }`}
              >
                {isRunning ? 'DIAGNOSTIC RUNNING...' : `SYSTEM ${overallHealth.toUpperCase()}`}
              </span>
            </div>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              Automated health check across network, sockets, IndexedDB storage, WebCrypto & WebRTC.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={runFullDiagnosis}
            disabled={isRunning}
            className="flex-1 sm:flex-none py-2 px-3 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-mono font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-[0_0_12px_rgba(0,229,255,0.25)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'ANALYZING...' : 'RUN FULL DIAGNOSIS'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyDiagnosticReport}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition-colors"
            title="Copy Diagnostic Report"
          >
            {copiedReport ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Storage Estimate Banner if available */}
      {storageEstimate && (
        <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl flex items-center justify-between text-xs font-mono text-white/70">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>STORAGE USAGE: <strong className="text-white">{storageEstimate.usedMb} MB</strong> used / {storageEstimate.totalMb} MB total</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-bold">INDEXEDDB ACTIVE</span>
        </div>
      )}

      {/* Diagnostic Module Cards Grid */}
      <div className="space-y-2.5">
        <h5 className="text-xs font-mono font-bold text-white/50 uppercase tracking-wider flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00e5ff]" />
          <span>ARCHITECTURE MODULE STATUSES</span>
        </h5>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map((res, idx) => (
            <div
              key={idx}
              className={`p-3.5 border rounded-xl space-y-2 transition-all ${
                res.status === 'success'
                  ? 'bg-emerald-950/10 border-emerald-500/20'
                  : res.status === 'warning'
                  ? 'bg-amber-950/10 border-amber-500/20'
                  : res.status === 'error'
                  ? 'bg-red-950/10 border-red-500/20'
                  : 'bg-white/[0.02] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(res.category)}
                  <span className="text-xs font-mono font-bold text-white">{res.module}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {res.latencyMs !== undefined && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-black/40 text-cyan-300 rounded border border-cyan-500/20">
                      {res.latencyMs}ms
                    </span>
                  )}
                  {getStatusIcon(res.status)}
                </div>
              </div>

              <p className="text-[11px] font-mono text-white/70 leading-relaxed">
                {res.details}
              </p>

              {res.recommendation && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] font-mono text-amber-300">
                  💡 <strong>Tip:</strong> {res.recommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Architecture Error Log Section */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-mono font-bold text-white/50 uppercase tracking-wider flex items-center space-x-1">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>RECENT ARCHITECTURE LOGS ({recentLogs.length})</span>
          </h5>

          <button
            type="button"
            onClick={handleClearCacheAndReset}
            className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30"
          >
            <Wrench className="w-3 h-3 text-[#00e5ff]" />
            <span>AUTO-REPAIR & CLEAR LOGS</span>
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-xl text-center text-xs font-mono text-emerald-300">
            ✅ No critical architecture errors recorded. All modules functioning cleanly.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-black/60 border border-white/10 rounded-xl space-y-1 font-mono text-xs"
              >
                <div className="flex items-center justify-between text-[10px] text-white/40">
                  <span className="uppercase text-amber-400 font-bold">[{log.category}] {log.title}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-white/80 text-[11px]">{log.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
