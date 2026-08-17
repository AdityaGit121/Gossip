import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Tv,
  Plus,
  Play,
  Pause,
  Users,
  Send,
  Share2,
  Monitor,
  Youtube,
  Music,
  Radio,
  Film,
  Link as LinkIcon,
  Sparkles,
  Volume2,
  VolumeX,
  Check,
  Copy,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { getSocket } from '../../services/socket.ts';
import { api } from '../../services/api.ts';
import { MediaRoom, RoomChatMessage, User } from '../../types.js';

interface MediaRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoomId?: string | null;
}

// Helper to extract YouTube ID
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export const MediaRoomModal: React.FC<MediaRoomModalProps> = ({ isOpen, onClose, initialRoomId }) => {
  const { user } = useAuth();
  const socket = getSocket();

  const [activeTab, setActiveTab] = useState<'lobby' | 'create'>('lobby');
  const [rooms, setRooms] = useState<MediaRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<MediaRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [joinRoomInput, setJoinRoomInput] = useState('');

  // Form states
  const [newRoomName, setNewRoomName] = useState('');
  const [newMediaType, setNewMediaType] = useState<'youtube' | 'shorts' | 'reels' | 'audio' | 'screenshare' | 'custom_video'>('youtube');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');

  // Room playback states
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<RoomChatMessage[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const isHost = activeRoom?.hostId === user?.id;

  const handleTogglePlay = () => {
    if (!isHost) return;
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    socket?.emit('sync_playback', { roomId: activeRoom?.id, isPlaying: nextPlaying, currentTime: customVideoRef.current?.currentTime || 0 });
  };

  const customVideoRef = useRef<HTMLVideoElement | null>(null);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);

  // Change Media in room modal state
  const [isChangingMedia, setIsChangingMedia] = useState(false);
  const [changeMediaUrl, setChangeMediaUrl] = useState('');
  const [changeMediaType, setChangeMediaType] = useState<'youtube' | 'shorts' | 'reels' | 'audio' | 'screenshare' | 'custom_video'>('youtube');

  // Screen share WebRTC state
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (customVideoRef.current) {
      if (isPlaying) {
        customVideoRef.current.play().catch(() => {});
      } else {
        customVideoRef.current.pause();
      }
    }
    if (customAudioRef.current) {
      if (isPlaying) {
        customAudioRef.current.play().catch(() => {});
      } else {
        customAudioRef.current.pause();
      }
    }
  }, [isPlaying, activeRoom?.mediaUrl]);

  // Fetch rooms on open
  useEffect(() => {
    if (isOpen) {
      fetchRooms();
      if (initialRoomId) {
        joinRoomById(initialRoomId);
      }
    } else {
      if (activeRoom) {
        leaveCurrentRoom();
      }
    }
  }, [isOpen, initialRoomId]);

  // Socket event listeners for Media Room
  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdated = (updatedRoom: MediaRoom) => {
      if (activeRoom && activeRoom.id === updatedRoom.id) {
        setActiveRoom(updatedRoom);
        setIsPlaying(updatedRoom.isPlaying);
        setChatMessages(updatedRoom.chatMessages || []);
      }
      setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
    };

    const handlePlaybackSynced = (data: { roomId: string; isPlaying: boolean; currentTime: number; senderId: string }) => {
      if (activeRoom && activeRoom.id === data.roomId) {
        setIsPlaying(data.isPlaying);
        setCurrentTime(data.currentTime);
      }
    };

    const handleNewRoomChat = (data: { roomId: string; chatMsg: RoomChatMessage }) => {
      if (activeRoom && activeRoom.id === data.roomId) {
        setChatMessages((prev) => [...prev, data.chatMsg]);
      }
    };

    const handleRoomWebRtcSignal = async (data: { senderId: string; roomId: string; signal: any }) => {
      if (!activeRoom || activeRoom.id !== data.roomId) return;
      const { senderId, signal } = data;

      if (signal.type === 'offer') {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerConnectionsRef.current[senderId] = pc;

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('room_webrtc_signal', {
              roomId: activeRoom.id,
              targetUserId: senderId,
              signal: { type: 'candidate', candidate: event.candidate },
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('room_webrtc_signal', {
          roomId: activeRoom.id,
          targetUserId: senderId,
          signal: { type: 'answer', sdp: answer },
        });
      } else if (signal.type === 'answer') {
        const pc = peerConnectionsRef.current[senderId];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }
      } else if (signal.type === 'candidate') {
        const pc = peerConnectionsRef.current[senderId];
        if (pc && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    };

    const handleRoomActionDenied = (data: { error: string }) => {
      setError(data.error);
      setTimeout(() => setError(null), 4000);
    };

    socket.on('room_updated', handleRoomUpdated);
    socket.on('playback_synced', handlePlaybackSynced);
    socket.on('new_room_chat', handleNewRoomChat);
    socket.on('room_webrtc_signal', handleRoomWebRtcSignal);
    socket.on('room_action_denied', handleRoomActionDenied);

    return () => {
      socket.off('room_updated', handleRoomUpdated);
      socket.off('playback_synced', handlePlaybackSynced);
      socket.off('new_room_chat', handleNewRoomChat);
      socket.off('room_webrtc_signal', handleRoomWebRtcSignal);
      socket.off('room_action_denied', handleRoomActionDenied);
    };
  }, [socket, activeRoom]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await api.getMediaRooms();
      setRooms(res.rooms);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch media rooms');
    } finally {
      setLoading(false);
    }
  };

  const joinRoomById = async (roomId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.joinMediaRoom(roomId);
      setActiveRoom(res.room);
      setChatMessages(res.room.chatMessages || []);
      setIsPlaying(res.room.isPlaying);
      if (socket) {
        socket.emit('join_media_room', { roomId });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join media room');
    } finally {
      setLoading(false);
    }
  };

  const leaveCurrentRoom = () => {
    if (activeRoom && socket) {
      socket.emit('leave_media_room', { roomId: activeRoom.id });
    }
    stopScreenShare();
    setActiveRoom(null);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.createMediaRoom({
        name: newRoomName.trim(),
        mediaType: newMediaType,
        mediaUrl: newMediaUrl.trim() || 'https://www.youtube.com/watch?v=5qap5aO4i9A',
        title: newTitle.trim() || 'Live Media Watch',
      });

      setActiveRoom(res.room);
      setChatMessages(res.room.chatMessages || []);
      if (socket) {
        socket.emit('join_media_room', { roomId: res.room.id });
      }
      setNewRoomName('');
      setNewMediaUrl('');
      setNewTitle('');
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRoom || !socket) return;
    socket.emit('send_room_chat', { roomId: activeRoom.id, text: chatInput.trim() });
    setChatInput('');
  };

  const handleTogglePlayback = () => {
    if (!activeRoom || !socket) return;
    if (activeRoom.hostId !== user?.id) {
      setError('Only the room host can control playback synchronization.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    socket.emit('sync_room_playback', {
      roomId: activeRoom.id,
      isPlaying: nextState,
      currentTime,
    });
  };

  const handleChangeMediaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !changeMediaUrl.trim()) return;
    if (activeRoom.hostId !== user?.id) {
      setError('Only the room host can change media.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setLoading(true);
      const res = await api.updateMediaRoomMedia(activeRoom.id, {
        mediaType: changeMediaType,
        mediaUrl: changeMediaUrl.trim(),
        title: changeMediaUrl.trim(),
      });
      setActiveRoom(res.room);
      setIsChangingMedia(false);
      setChangeMediaUrl('');
      if (socket) {
        socket.emit('update_room_media', {
          roomId: activeRoom.id,
          mediaType: changeMediaType,
          mediaUrl: changeMediaUrl.trim(),
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update media URL');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetRoomId = roomId || activeRoom?.id;
    if (!targetRoomId) return;
    if (roomId && !window.confirm('Are you sure you want to delete this media room?')) return;
    try {
      setLoading(true);
      await api.deleteMediaRoom(targetRoomId);
      if (!roomId || activeRoom?.id === roomId) {
        leaveCurrentRoom();
      }
      await fetchRooms();
    } catch (err: any) {
      setError(err.message || 'Failed to delete room');
    } finally {
      setLoading(false);
    }
  };

  // Screen Sharing WebRTC implementation
  const startScreenShare = async () => {
    if (!activeRoom || !socket) return;
    if (activeRoom.hostId !== user?.id) {
      setError('Only the room host can share screen.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      setIsScreenSharing(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Update room media type to screen share
      socket.emit('update_room_media', {
        roomId: activeRoom.id,
        mediaType: 'screenshare',
        mediaUrl: 'SCREEN_SHARE_LIVE',
        title: `${user?.name}'s Screen Share`,
      });

      // Connect WebRTC to participants safely
      (activeRoom?.participants || []).forEach(async (p) => {
        if (!p || p.id === user?.id) return;
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerConnectionsRef.current[p.id] = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('room_webrtc_signal', {
              roomId: activeRoom.id,
              targetUserId: p.id,
              signal: { type: 'candidate', candidate: event.candidate },
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('room_webrtc_signal', {
          roomId: activeRoom.id,
          targetUserId: p.id,
          signal: { type: 'offer', sdp: offer },
        });
      });

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Screen share error:', err);
    }
  };

  const stopScreenShare = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    Object.values(peerConnectionsRef.current).forEach((pc: RTCPeerConnection) => pc?.close());
    peerConnectionsRef.current = {};
    setIsScreenSharing(false);
  };

  const handleJoinByInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomInput.trim()) return;
    let roomId = joinRoomInput.trim();
    if (roomId.includes('room=')) {
      const match = roomId.match(/room=([^&]+)/);
      if (match) roomId = match[1];
    }
    joinRoomById(roomId);
  };

  const handleCopyShareLink = () => {
    if (!activeRoom) return;
    const shareUrl = `${window.location.origin}?room=${activeRoom.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-6xl h-[92vh] bg-[#0c0d12] border border-cyan-500/30 rounded-2xl shadow-[0_0_60px_rgba(0,229,255,0.15)] flex flex-col overflow-hidden relative"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#11131a] border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-cyan-500/15 border border-cyan-500/30 rounded-xl text-[#00e5ff]">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-medium text-white tracking-tight flex items-center space-x-2">
                  <span>ROOM</span>
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-[#00e5ff] text-[10px] font-mono rounded-md border border-cyan-500/30">
                    PRIVATE_INVITE_ONLY
                  </span>
                </h3>
                <p className="text-[11px] font-mono text-white/40">
                  {activeRoom ? `ROOM: ${activeRoom.name}` : 'ENTER_ROOM_ID_OR_CREATE_PRIVATE_ROOM'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {activeRoom && (
                <button
                  onClick={handleCopyShareLink}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#00e5ff]" />}
                  <span className="hidden sm:inline">{copiedLink ? 'LINK_COPIED' : 'SHARE_ROOM'}</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body */}
          {activeRoom ? (
            /* ACTIVE WATCH ROOM VIEW */
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#07080c]">
              {/* Left Video / Player Stage */}
              <div className="flex-1 flex flex-col min-w-0 bg-black relative">
                {/* Media Stage Area */}
                <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden group">
                  {activeRoom.mediaType === 'youtube' || activeRoom.mediaType === 'shorts' || activeRoom.mediaType === 'reels' ? (
                    (() => {
                      const ytId = extractYouTubeId(activeRoom.mediaUrl);
                      if (ytId) {
                        return (
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1`}
                            title={activeRoom.title}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        );
                      }
                      return (
                        <iframe
                          src={activeRoom.mediaUrl}
                          title={activeRoom.title}
                          className="w-full h-full border-0"
                          allowFullScreen
                        />
                      );
                    })()
                  ) : activeRoom.mediaType === 'screenshare' ? (
                    <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center relative p-4">
                      {isScreenSharing ? (
                        <video ref={localVideoRef} autoPlay playsInline muted className="max-w-full max-h-full rounded-xl border border-cyan-500/30 shadow-2xl" />
                      ) : (
                        <video ref={remoteVideoRef} autoPlay playsInline className="max-w-full max-h-full rounded-xl border border-cyan-500/30 shadow-2xl" />
                      )}

                      {!isScreenSharing && !remoteVideoRef.current?.srcObject && (
                        <div className="text-center space-y-3 font-mono">
                          <Monitor className="w-12 h-12 text-[#00e5ff] mx-auto animate-pulse" />
                          <h4 className="text-sm text-white">WAITING_FOR_SCREEN_SHARE_STREAM...</h4>
                          <p className="text-xs text-white/40">Host or Presenter can broadcast screen in real time.</p>
                        </div>
                      )}
                    </div>
                  ) : activeRoom.mediaType === 'audio' ? (
                    /* Audio Visualizer Stage */
                    <div className="w-full h-full bg-gradient-to-br from-cyan-950/40 via-purple-950/20 to-black flex flex-col items-center justify-center p-6 text-center space-y-6">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-cyan-500/20 border-2 border-[#00e5ff] flex items-center justify-center animate-pulse">
                          <Music className="w-16 h-16 text-[#00e5ff]" />
                        </div>
                        <div className="absolute -inset-4 bg-cyan-500/10 rounded-full blur-xl -z-10 animate-ping" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white font-mono">{activeRoom.title}</h4>
                        <p className="text-xs text-white/50 font-mono mt-1">YOUTUBE_MUSIC_SYNCHRONIZED_AUDIO</p>
                      </div>

                      {activeRoom.mediaUrl && (
                        <audio ref={customAudioRef} src={activeRoom.mediaUrl} controls autoPlay className="w-full max-w-md accent-cyan-400" />
                      )}
                    </div>
                  ) : (
                    /* Custom MP4 / Video Stage */
                    <video
                      ref={customVideoRef}
                      src={activeRoom.mediaUrl}
                      controls
                      autoPlay={isPlaying}
                      className="w-full h-full max-h-[70vh] object-contain"
                    />
                  )}
                </div>

                {/* Host Sync Player Controls */}
                <div className="p-3 bg-[#0f1118] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0 font-mono text-xs">
                  <div className="flex items-center space-x-2 min-w-0">
                    <button
                      onClick={handleTogglePlay}
                      className={`p-2.5 rounded-xl transition-all shadow-[0_2px_12px_rgba(0,229,255,0.3)] shrink-0 ${isHost ? 'bg-[#00e5ff] hover:bg-[#33ebff] text-black' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                      title={isHost ? (isPlaying ? 'Pause for everyone' : 'Play for everyone') : 'Only admin can control playback'}
                      disabled={!isHost}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{activeRoom.title || activeRoom.name}</h4>
                      <p className="text-[10px] text-white/40 truncate flex items-center space-x-2">
                        <span>HOST: {activeRoom.hostUser.name}</span>
                        <span>•</span>
                        <span className="uppercase text-[#00e5ff]">{activeRoom.mediaType}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsChangingMedia(!isChangingMedia)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 hover:text-white transition-all flex items-center space-x-1.5"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-[#00e5ff]" />
                      <span>CHANGE_MEDIA</span>
                    </button>

                    <button
                      onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                      className={`px-3 py-1.5 border rounded-xl transition-all flex items-center space-x-1.5 ${
                        isScreenSharing
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                          : 'bg-cyan-500/10 border-cyan-500/30 text-[#00e5ff] hover:bg-cyan-500/20'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>{isScreenSharing ? 'STOP_SHARE' : 'SCREEN_SHARE'}</span>
                    </button>

                    {activeRoom.hostId === user?.id && (
                      <button
                        onClick={() => handleDeleteRoom()}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl transition-all"
                        title="Close/Delete Room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={leaveCurrentRoom}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-mono transition-all"
                    >
                      LEAVE_ROOM
                    </button>
                  </div>
                </div>

                {/* Inline Change Media Form Popup */}
                {isChangingMedia && (
                  <form onSubmit={handleChangeMediaSubmit} className="p-3 bg-[#11131c] border-t border-cyan-500/30 flex items-center space-x-2 font-mono text-xs z-10">
                    <select
                      value={changeMediaType}
                      onChange={(e: any) => setChangeMediaType(e.target.value)}
                      className="bg-black border border-white/10 rounded-xl px-2 py-1.5 text-white outline-none"
                    >
                      <option value="youtube">YouTube Video</option>
                      <option value="shorts">YouTube Shorts</option>
                      <option value="audio">YouTube Music / Audio</option>
                      <option value="reels">Instagram Reels</option>
                      <option value="custom_video">Direct Video (MP4)</option>
                    </select>

                    <input
                      type="text"
                      value={changeMediaUrl}
                      onChange={(e) => setChangeMediaUrl(e.target.value)}
                      placeholder="Paste YouTube, Reels, or Shorts URL..."
                      className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-1.5 text-white outline-none placeholder-white/30"
                    />

                    <button
                      type="submit"
                      disabled={!changeMediaUrl.trim()}
                      className="px-3 py-1.5 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-bold rounded-xl disabled:opacity-50"
                    >
                      UPDATE
                    </button>
                  </form>
                )}
              </div>

              {/* Right Live Room Chat & Participants */}
              <div className="w-full lg:w-80 bg-[#0d0e14] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col h-64 lg:h-full shrink-0">
                {/* Participants Header */}
                <div className="p-3 bg-white/[0.02] border-b border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-white/60 flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-[#00e5ff]" />
                    <span>WATCHERS ({activeRoom.participants?.length || 1})</span>
                  </span>

                  <div className="flex -space-x-2">
                    {activeRoom.participants?.map((p) => (
                      <img
                        key={p.id}
                        src={p.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`}
                        alt={p.name}
                        title={p.name}
                        className="w-6 h-6 rounded-full border border-black object-cover"
                      />
                    ))}
                  </div>
                </div>

                {/* Chat Messages Feed */}
                <div ref={chatScrollRef} className="flex-1 p-3 overflow-y-auto space-y-2.5 custom-scrollbar font-mono text-xs">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8 text-white/30 text-[11px]">
                      <Sparkles className="w-6 h-6 text-[#00e5ff]/40 mx-auto mb-2" />
                      <p>LIVE_ROOM_CHAT_READY</p>
                      <p className="text-[10px]">Send reactions while watching together!</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="p-2 bg-white/[0.03] border border-white/5 rounded-xl space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#00e5ff] text-[11px]">{msg.sender.name}</span>
                          <span className="text-[9px] text-white/30">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-white/90 text-xs break-words">{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendChat} className="p-2 bg-[#12141d] border-t border-white/10 flex items-center space-x-2 font-mono">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type reaction in room..."
                    className="flex-1 bg-black border border-white/10 focus:border-[#00e5ff]/60 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* LOBBY / ROOM LIST / CREATE ROOM VIEW */
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">
              {/* Navigation Tabs */}
              <div className="flex border-b border-white/10 space-x-6 text-xs font-mono">
                <button
                  onClick={() => setActiveTab('lobby')}
                  className={`pb-2.5 border-b-2 transition-all flex items-center space-x-2 ${
                    activeTab === 'lobby' ? 'border-[#00e5ff] text-[#00e5ff]' : 'border-transparent text-white/50 hover:text-white'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>ACTIVE_ROOMS ({rooms.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('create')}
                  className={`pb-2.5 border-b-2 transition-all flex items-center space-x-2 ${
                    activeTab === 'create' ? 'border-[#00e5ff] text-[#00e5ff]' : 'border-transparent text-white/50 hover:text-white'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>CREATE_NEW_ROOM</span>
                </button>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono">
                  {error}
                </div>
              )}

              {activeTab === 'lobby' ? (
                /* Private Room Join & User Rooms */
                <div className="space-y-6">
                  {/* Join with ID/Link form */}
                  <form onSubmit={handleJoinByInput} className="p-4 bg-white/[0.02] border border-cyan-500/30 rounded-2xl space-y-3 font-mono text-xs">
                    <div className="flex items-center space-x-2 text-[#00e5ff] font-semibold">
                      <LinkIcon className="w-4 h-4" />
                      <span>JOIN_PRIVATE_ROOM_BY_ID</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={joinRoomInput}
                        onChange={(e) => setJoinRoomInput(e.target.value)}
                        placeholder="Paste 6-digit Room ID (e.g. 481920) or share link..."
                        className="flex-1 px-4 py-2.5 bg-black border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-white outline-none placeholder-white/30"
                      />
                      <button
                        type="submit"
                        disabled={!joinRoomInput.trim() || loading}
                        className="px-5 py-2.5 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-bold rounded-xl transition-all disabled:opacity-50"
                      >
                        JOIN ROOM
                      </button>
                    </div>
                    <p className="text-[10px] text-white/40">
                      🔒 Rooms are strictly private. Only invited persons or those with the Room ID can join.
                    </p>
                  </form>

                  {/* Rooms list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono text-white/60">YOUR_PRIVATE_ROOMS ({rooms.length})</h4>
                    {rooms.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl space-y-3">
                        <Tv className="w-10 h-10 text-[#00e5ff]/40 mx-auto" />
                        <div>
                          <h4 className="text-xs font-light text-white font-mono">NO_ACTIVE_PRIVATE_ROOMS</h4>
                          <p className="text-[11px] text-white/40 font-mono mt-1">Create a private room and share the Room ID with friends to watch together.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('create')}
                          className="px-4 py-2 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold rounded-xl text-xs font-mono transition-all"
                        >
                          + CREATE PRIVATE ROOM
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rooms.map((room) => (
                          <div
                            key={room.id}
                            onClick={() => joinRoomById(room.id)}
                            className="p-4 bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 hover:border-[#00e5ff]/50 rounded-2xl cursor-pointer transition-all space-y-3 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 bg-cyan-500/15 text-[#00e5ff] text-[10px] font-mono rounded border border-cyan-500/30 uppercase">
                                PRIVATE {room.mediaType}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-mono text-white/40 flex items-center space-x-1">
                                  <Users className="w-3 h-3 text-[#00e5ff]" />
                                  <span>{room.participants?.length || 1} online</span>
                                </span>
                                {(room.hostId === user?.id || !room.hostId) && (
                                  <button
                                    onClick={(e) => handleDeleteRoom(room.id, e)}
                                    className="p-1 text-white/40 hover:text-rose-400 transition-colors"
                                    title="Delete Room"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-semibold text-white group-hover:text-[#00e5ff] transition-colors truncate">
                                {room.name}
                              </h4>
                              <p className="text-xs text-white/50 truncate font-mono mt-0.5">ID: {room.id}</p>
                            </div>

                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                              <div className="flex items-center space-x-2">
                                <img
                                  src={room.hostUser.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.hostUser.username}`}
                                  alt={room.hostUser.name}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                                <span className="text-white/60 text-[11px] truncate">{room.hostUser.name}</span>
                              </div>

                              <span className="text-[#00e5ff] font-bold text-[11px] group-hover:translate-x-1 transition-transform">
                                ENTER →
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Create Room Form */
                <form onSubmit={handleCreateRoom} className="max-w-xl mx-auto space-y-5 font-mono text-xs">
                  <div>
                    <label className="block text-white/70 mb-1.5">ROOM_NAME:</label>
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g., Midnight Movie Lounge or Lo-Fi Beats Sync"
                      className="w-full px-4 py-3 bg-[#0a0b0f] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-white outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 mb-1.5">MEDIA_TYPE:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'youtube', label: 'YouTube Video', icon: Youtube },
                        { id: 'shorts', label: 'YouTube Shorts', icon: Film },
                        { id: 'audio', label: 'YouTube Music', icon: Music },
                        { id: 'reels', label: 'Instagram Reels', icon: Tv },
                        { id: 'screenshare', label: 'Screen Share', icon: Monitor },
                        { id: 'custom_video', label: 'Direct MP4 Link', icon: LinkIcon },
                      ].map((type) => {
                        const IconComponent = type.icon;
                        const isSelected = newMediaType === type.id;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setNewMediaType(type.id as any)}
                            className={`p-3 border rounded-xl transition-all text-center flex flex-col items-center space-y-1.5 ${
                              isSelected
                                ? 'bg-cyan-500/20 border-[#00e5ff] text-[#00e5ff]'
                                : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                            }`}
                          >
                            <IconComponent className="w-5 h-5" />
                            <span className="text-[10px] font-semibold">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {newMediaType !== 'screenshare' && (
                    <div>
                      <label className="block text-white/70 mb-1.5">MEDIA_URL / LINK:</label>
                      <input
                        type="text"
                        value={newMediaUrl}
                        onChange={(e) => setNewMediaUrl(e.target.value)}
                        placeholder="Paste YouTube, Shorts, or Reels link here..."
                        className="w-full px-4 py-3 bg-[#0a0b0f] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-white outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-white/70 mb-1.5">STREAM_TITLE (OPTIONAL):</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g., Lofi Hip Hop Radio - Beats to relax to"
                      className="w-full px-4 py-3 bg-[#0a0b0f] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-white outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !newRoomName.trim()}
                    className="w-full py-3.5 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-bold rounded-xl text-xs transition-all shadow-[0_4px_24px_rgba(0,229,255,0.25)] disabled:opacity-50"
                  >
                    {loading ? 'INITIALIZING_ROOM...' : '🚀 LAUNCH MEDIA WATCH ROOM'}
                  </button>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
