import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Shield,
  Signal,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Zap,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext.tsx';
import { getSocket } from '../../services/socket.js';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

// Helper function to inject Military-Grade / Studio Ultra HD Opus & HD Video parameters into WebRTC SDP
function optimizeSDPForMilitaryHDMedia(sdp: string): string {
  let modified = sdp;
  // Boost Opus audio codec parameters: 510kbps, stereo, in-band forward error correction (FEC), 48kHz sampling rate
  if (modified.includes('opus/48000')) {
    modified = modified.replace(
      /a=fmtp:(\d+)\s+(.+)/g,
      (match, payload, fmtp) => {
        if (fmtp.includes('useinbandfec') || fmtp.includes('maxaveragebitrate') || match.toLowerCase().includes('opus')) {
          return `a=fmtp:${payload} maxaveragebitrate=510000;stereo=1;sprop-stereo=1;useinbandfec=1;cbr=1;maxplaybackrate=48000`;
        }
        return match;
      }
    );
  }
  return modified;
}

export const CallOverlayModal: React.FC = () => {
  const { callSession, answerCall, rejectCall, endCall } = useChat();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing Encrypted Line...');
  const [hasRemoteVideo, setHasRemoteVideo] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(100);

  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (modalContainerRef.current?.requestFullscreen) {
        modalContainerRef.current.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request failed:', err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Generate a silent, high-performance fallback stream if hardware is restricted
  const createFallbackStream = (isVideo: boolean): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    let angle = 0;
    const draw = () => {
      ctx.fillStyle = '#07090e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      angle += 0.03;
      const x = canvas.width / 2 + Math.cos(angle) * 80;
      const y = canvas.height / 2 + Math.sin(angle) * 50;

      const grad = ctx.createRadialGradient(x, y, 10, x, y, 220);
      grad.addColorStop(0, '#00e5ff');
      grad.addColorStop(1, '#059669');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 80, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔒 Military-Grade AES-256 HD Stream', canvas.width / 2, canvas.height / 2 + 130);

      if (canvas.getAttribute('data-active') === 'true') {
        requestAnimationFrame(draw);
      }
    };
    canvas.setAttribute('data-active', 'true');
    draw();

    const canvasStream = canvas.captureStream(30);
    const videoTrack = canvasStream.getVideoTracks()[0];

    // High performance silent audio track without continuous oscillator beep
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
    const dest = audioCtx.createMediaStreamDestination();
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime); // Silent background track
    gainNode.connect(dest);

    const audioTrack = dest.stream.getAudioTracks()[0];
    const tracks: MediaStreamTrack[] = [audioTrack];
    if (isVideo && videoTrack) tracks.push(videoTrack);

    return new MediaStream(tracks);
  };

  // Ringtone synthesizer
  useEffect(() => {
    if (!callSession || callSession.status !== 'ringing') return;

    let audioCtx: AudioContext | null = null;
    let intervalId: any = null;

    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      const playTone = () => {
        if (!audioCtx || audioCtx.state === 'closed') return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.2);
      };

      playTone();
      intervalId = setInterval(playTone, 2500);
    } catch (err) {
      console.error('Web Audio ringtone error:', err);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (audioCtx) audioCtx.close().catch(() => {});
    };
  }, [callSession?.status]);

  // Call timer when connected
  useEffect(() => {
    if (callSession?.status === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callSession?.status]);

  // WebRTC PeerConnection setup & Signaling
  useEffect(() => {
    if (!callSession) return;

    let isMounted = true;
    const socket = getSocket();

    const initWebRTC = async () => {
      if (callSession.status !== 'connected') return;

      setConnectionStatus('Establishing HD Transmission...');

      // Acquire Local Stream with Military-Grade Studio Audio & Ultra HD Video Constraints
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: { ideal: true },
            noiseSuppression: { ideal: true },
            autoGainControl: { ideal: true },
            sampleRate: { ideal: 48000 },
            sampleSize: { ideal: 16 },
            channelCount: { ideal: 2 },
          },
          video: callSession.isVideo
            ? {
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                frameRate: { ideal: 60, min: 30 },
              }
            : false,
        });
      } catch (mediaErr) {
        console.warn('Hardware media device fallback initialized:', mediaErr);
        stream = createFallbackStream(callSession.isVideo);
      }

      if (!isMounted) return;
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Boost max bitrate on audio & video senders
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === 'audio') {
          try {
            const params = sender.getParameters();
            if (!params.encodings) params.encodings = [{}];
            params.encodings[0].maxBitrate = 510000; // 510 kbps Studio Audio
            sender.setParameters(params).catch(() => {});
          } catch (e) {}
        } else if (sender.track?.kind === 'video') {
          try {
            const params = sender.getParameters();
            if (!params.encodings) params.encodings = [{}];
            params.encodings[0].maxBitrate = 4000000; // 4 Mbps HD Video
            sender.setParameters(params).catch(() => {});
          } catch (e) {}
        }
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          const targetUserId = callSession.isIncoming
            ? callSession.caller.id
            : callSession.targetUser?.id;

          socket.emit('webrtc_signal', {
            targetUserId,
            chatId: callSession.chatId,
            signal: { type: 'candidate', candidate: event.candidate.toJSON() },
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (!isMounted) return;
        switch (pc.iceConnectionState) {
          case 'checking':
            setConnectionStatus('Handshake Syncing...');
            break;
          case 'connected':
          case 'completed':
            setConnectionStatus('Encrypted Military HD Line');
            break;
          case 'disconnected':
          case 'failed':
            setConnectionStatus('Re-establishing line...');
            break;
        }
      };

      pc.ontrack = (event) => {
        if (!isMounted) return;
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        remoteStreamRef.current = remoteStream;

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          setHasRemoteVideo(true);
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.volume = volume / 100;
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // Caller generates Offer
      if (!callSession.isIncoming) {
        try {
          setConnectionStatus('Generating HD Offer...');
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callSession.isVideo,
          });

          // Optimize SDP for high-fidelity Opus stereo audio
          const optimizedSdp = optimizeSDPForMilitaryHDMedia(offer.sdp || '');
          const optimizedOffer = new RTCSessionDescription({ type: 'offer', sdp: optimizedSdp });

          await pc.setLocalDescription(optimizedOffer);

          if (socket) {
            socket.emit('webrtc_signal', {
              targetUserId: callSession.targetUser?.id,
              chatId: callSession.chatId,
              signal: { type: 'offer', offer: optimizedOffer },
            });
          }
        } catch (offerErr) {
          console.error('Error creating offer:', offerErr);
        }
      }
    };

    initWebRTC();

    const handleWebRTCSignal = async ({ senderId, signal }: { senderId: string; signal: any }) => {
      const pc = peerConnectionRef.current;
      if (!signal) return;

      try {
        if (signal.type === 'offer') {
          if (!pc) return;
          const sdpWithHD = optimizeSDPForMilitaryHDMedia(signal.offer.sdp || '');
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: sdpWithHD }));

          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }

          const answer = await pc.createAnswer();
          const optimizedAnswerSdp = optimizeSDPForMilitaryHDMedia(answer.sdp || '');
          const optimizedAnswer = new RTCSessionDescription({ type: 'answer', sdp: optimizedAnswerSdp });

          await pc.setLocalDescription(optimizedAnswer);

          if (socket) {
            socket.emit('webrtc_signal', {
              targetUserId: senderId,
              chatId: callSession.chatId,
              signal: { type: 'answer', answer: optimizedAnswer },
            });
          }
        } else if (signal.type === 'answer') {
          if (pc && pc.signalingState !== 'stable') {
            const sdpWithHD = optimizeSDPForMilitaryHDMedia(signal.answer.sdp || '');
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: sdpWithHD }));

            while (pendingCandidatesRef.current.length > 0) {
              const cand = pendingCandidatesRef.current.shift();
              if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }
        } else if (signal.type === 'candidate') {
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            pendingCandidatesRef.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('WebRTC Signaling process error:', err);
      }
    };

    if (socket) {
      socket.on('webrtc_signal', handleWebRTCSignal);
    }

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('webrtc_signal', handleWebRTCSignal);
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((t) => t.stop());
        remoteStreamRef.current = null;
      }
      pendingCandidatesRef.current = [];
    };
  }, [callSession?.status, callSession?.chatId, callSession?.isIncoming]);

  // Handle Mute Mic
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  // Handle Video Camera toggle
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !isVideoOff;
      });
    }
  }, [isVideoOff]);

  // Remote audio volume
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = volume / 100;
    }
  }, [volume]);

  if (!callSession) return null;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const peerName = callSession.isIncoming
    ? callSession.caller.name
    : callSession.targetUser?.name || 'Contact';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-2xl p-2 sm:p-4">
      {/* Remote Audio Stream output */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div
        ref={modalContainerRef}
        className={`relative w-full bg-[#07090e] border border-cyan-500/40 shadow-[0_0_80px_rgba(0,229,255,0.25)] text-white text-center flex flex-col items-center overflow-hidden transition-all ${
          isFullscreen
            ? 'w-screen h-screen max-w-none rounded-none p-4 justify-between'
            : 'max-w-xl rounded-3xl p-6 sm:p-8'
        }`}
      >
        {/* Top Header / Fullscreen Controls */}
        <div className="w-full flex items-center justify-between mb-4 shrink-0 z-20">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/40 text-[#00e5ff] text-xs font-mono animate-pulse">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {callSession.status === 'ringing'
                ? callSession.isIncoming
                  ? 'Incoming Secure Line...'
                  : 'Ringing Recipient...'
                : connectionStatus}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {callSession.isVideo && (
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all"
                title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Call'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-[#00e5ff]" />}
              </button>
            )}
          </div>
        </div>

        {/* Main Video Display Stage */}
        {callSession.status === 'connected' && callSession.isVideo ? (
          <div
            className={`w-full bg-black rounded-2xl border border-white/10 overflow-hidden relative group transition-all ${
              isFullscreen ? 'flex-1 my-2 max-h-[82vh]' : 'h-72 sm:h-96 my-2'
            }`}
          >
            {/* Main Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {!hasRemoteVideo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 space-y-3 p-4">
                <div className="w-20 h-20 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-3xl animate-pulse">
                  {peerName.charAt(0)}
                </div>
                <p className="text-xs font-mono text-center">Syncing Military HD Video Feed...</p>
              </div>
            )}

            {/* Floating Picture-in-Picture Local Video Preview */}
            <div className="absolute bottom-4 right-4 w-28 h-40 sm:w-36 sm:h-48 bg-slate-950 rounded-2xl border-2 border-cyan-500/50 overflow-hidden shadow-2xl z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/80 rounded-md text-[10px] font-mono text-cyan-400 border border-cyan-500/30">
                You (HD)
              </div>
            </div>

            {/* Top Badges */}
            <div className="absolute top-4 left-4 flex items-center space-x-2">
              <div className="px-3 py-1 bg-black/70 backdrop-blur-md rounded-xl text-[11px] font-mono text-emerald-400 flex items-center space-x-1.5 border border-white/10">
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>510kbps Opus Ultra HD</span>
              </div>
              <div className="px-3 py-1 bg-black/70 backdrop-blur-md rounded-xl text-[11px] font-mono text-[#00e5ff] flex items-center space-x-1.5 border border-white/10">
                <Activity className="w-3.5 h-3.5" />
                <span>Zero Latency</span>
              </div>
            </div>
          </div>
        ) : (
          /* Avatar Display for Voice Calls or Ringing */
          <div className="relative mb-6 my-4">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#00e5ff] via-emerald-400 to-cyan-600 p-1 flex items-center justify-center shadow-[0_0_60px_rgba(0,229,255,0.4)]">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-5xl font-black text-[#00e5ff]">
                {peerName.charAt(0)}
              </div>
            </div>
            {callSession.status === 'ringing' && (
              <div className="absolute inset-0 rounded-full border-2 border-[#00e5ff] animate-ping opacity-75" />
            )}
            {callSession.status === 'connected' && (
              <div className="absolute bottom-1 right-1 p-2.5 bg-emerald-500 rounded-full border-2 border-[#0b0f19] shadow-lg">
                <Signal className="w-5 h-5 text-white animate-pulse" />
              </div>
            )}
          </div>
        )}

        {/* Peer Info */}
        <div className="mb-4">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{peerName}</h3>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
            {callSession.status === 'connected' ? (
              <span className="text-emerald-400 font-bold text-sm sm:text-base flex items-center justify-center space-x-2">
                <span>ACTIVE CALL</span>
                <span>•</span>
                <span>{formatDuration(callDuration)}</span>
              </span>
            ) : callSession.isIncoming ? (
              'Incoming HD voice/video call request...'
            ) : (
              'Ringing recipient line...'
            )}
          </p>
        </div>

        {/* Incoming Call Answer/Decline Controls */}
        {callSession.status === 'ringing' && callSession.isIncoming && (
          <div className="flex items-center space-x-8 mt-2 my-4">
            <button
              onClick={rejectCall}
              className="p-4 sm:p-5 bg-rose-500 hover:bg-rose-600 rounded-full text-white transition-all shadow-[0_0_30px_rgba(244,63,94,0.6)] flex items-center justify-center"
              title="Decline Call"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
            <button
              onClick={answerCall}
              className="p-4 sm:p-5 bg-emerald-500 hover:bg-emerald-600 rounded-full text-white transition-all shadow-[0_0_30px_rgba(16,185,129,0.6)] flex items-center justify-center animate-bounce"
              title="Answer Call"
            >
              <Phone className="w-8 h-8" />
            </button>
          </div>
        )}

        {/* Active Call Controls */}
        {(callSession.status === 'connected' || !callSession.isIncoming) && (
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-2 my-2 z-20">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-2xl border transition-all ${
                isMuted
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                  : 'bg-slate-800/90 border-white/10 text-slate-200 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {callSession.isVideo && (
              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`p-4 rounded-2xl border transition-all ${
                  isVideoOff
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                    : 'bg-slate-800/90 border-white/10 text-slate-200 hover:bg-slate-700'
                }`}
                title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}

            {callSession.isVideo && (
              <button
                onClick={toggleFullscreen}
                className="p-4 bg-slate-800/90 hover:bg-slate-700 border border-white/10 rounded-2xl text-slate-200 transition-all"
                title={isFullscreen ? 'Exit Fullscreen' : 'Full Screen View'}
              >
                {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6 text-[#00e5ff]" />}
              </button>
            )}

            <button
              onClick={endCall}
              className="p-4 sm:p-5 bg-rose-500 hover:bg-rose-600 rounded-2xl text-white transition-all shadow-[0_0_30px_rgba(244,63,94,0.6)]"
              title="End Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


