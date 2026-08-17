import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Share2,
  Lock,
  Globe,
  Eye,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
  Type,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Copy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.js';
import { Moment } from '../../types.js';

interface MomentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMomentId?: string | null;
}

export const MomentsModal: React.FC<MomentsModalProps> = ({ isOpen, onClose, initialMomentId }) => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'feed' | 'create' | 'player'>('feed');
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Story player states
  const [selectedMomentIndex, setSelectedMomentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Create Moment states
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'audio' | 'text'>('photo');
  const [mediaURL, setMediaURL] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [backgroundColor, setBackgroundColor] = useState<string>('#111827');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [publishing, setPublishing] = useState(false);

  // Audio Recording states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingTime, setAudioRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMoments();
    } else {
      setActiveView('feed');
      setProgress(0);
      setIsPlaying(false);
    }
  }, [isOpen]);

  // Handle opening a specific shared moment via URL parameter
  useEffect(() => {
    if (initialMomentId && moments.length > 0) {
      const targetIdx = moments.findIndex((m) => m.id === initialMomentId);
      if (targetIdx !== -1) {
        setSelectedMomentIndex(targetIdx);
        setActiveView('player');
      } else {
        // Fetch single shared moment
        api
          .getMomentById(initialMomentId)
          .then((res) => {
            if (res.moment) {
              setMoments((prev) => [res.moment, ...prev.filter((p) => p.id !== res.moment.id)]);
              setSelectedMomentIndex(0);
              setActiveView('player');
            }
          })
          .catch(() => {});
      }
    }
  }, [initialMomentId, moments]);

  const fetchMoments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMoments();
      setMoments(res.moments);
    } catch (err: any) {
      setError(err.message || 'Failed to load moments');
    } finally {
      setLoading(false);
    }
  };

  // Auto-advance story progress bar
  useEffect(() => {
    let interval: any;
    if (activeView === 'player' && isPlaying && moments.length > 0) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            handleNextStory();
            return 0;
          }
          return prev + 2; // Advance ~5 seconds total duration
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [activeView, isPlaying, selectedMomentIndex, moments]);

  // Record view count when player opens
  useEffect(() => {
    if (activeView === 'player' && moments[selectedMomentIndex]) {
      const current = moments[selectedMomentIndex];
      api.recordMomentView(current.id).catch(() => {});
    }
  }, [activeView, selectedMomentIndex]);

  const currentMoment = moments[selectedMomentIndex];

  const handleNextStory = () => {
    if (selectedMomentIndex < moments.length - 1) {
      setSelectedMomentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      setActiveView('feed');
      setProgress(0);
    }
  };

  const handlePrevStory = () => {
    if (selectedMomentIndex > 0) {
      setSelectedMomentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleCopyMomentLink = (momentId: string) => {
    const link = `${window.location.origin}/?moment=${momentId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDeleteMoment = async (momentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this Moment permanently?')) return;

    try {
      await api.deleteMoment(momentId);
      setMoments((prev) => prev.filter((m) => m.id !== momentId));
      if (activeView === 'player') {
        setActiveView('feed');
      }
    } catch (err: any) {
      alert('Failed to delete moment');
    }
  };

  // Media file handling for photo/video/audio
  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setMediaURL(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Direct Audio Recording
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (evt) => {
          setMediaURL(evt.target?.result as string);
          setMediaType('audio');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecordingAudio(true);
      setAudioRecordingTime(0);

      timerRef.current = setInterval(() => {
        setAudioRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Camera / Microphone access denied');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      clearInterval(timerRef.current);
    }
  };

  const handlePublishMoment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mediaType !== 'text' && !mediaURL) {
      alert('Please upload or record media first!');
      return;
    }
    if (mediaType === 'text' && !caption.trim()) {
      alert('Please enter text for your status!');
      return;
    }

    setPublishing(true);
    try {
      const res = await api.createMoment({
        mediaType,
        mediaURL,
        caption,
        backgroundColor,
        privacy,
      });

      setMoments((prev) => [res.moment, ...prev]);
      setActiveView('feed');
      // Reset form
      setMediaURL('');
      setCaption('');
      setMediaType('photo');
    } catch (err: any) {
      alert(err.message || 'Failed to publish moment');
    } finally {
      setPublishing(false);
    }
  };

  if (!isOpen) return null;

  const bgColors = ['#0f172a', '#1e1b4b', '#31103f', '#064e3b', '#701a75', '#450a0a'];

  const myMoments = moments.filter((m) => user && m.userId === user.id);
  const publicMoments = moments.filter((m) => user && m.userId !== user.id);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md h-[90vh] bg-[#0b0f17] border border-[#00e5ff]/30 rounded-3xl shadow-2xl text-white font-sans flex flex-col overflow-hidden"
        >
          {/* Top Header Bar */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0f1420]">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-[#00e5ff]/10 text-[#00e5ff] rounded-xl border border-[#00e5ff]/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Moments</h3>
                <p className="text-[10px] font-mono text-cyan-400">ENCRYPTED_STATUS_STORIES</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {activeView === 'feed' && (
                <button
                  onClick={() => setActiveView('create')}
                  className="px-3 py-1.5 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold rounded-xl text-xs flex items-center space-x-1 font-mono transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD_STATUS</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto relative flex flex-col">
            {activeView === 'feed' ? (
              <div className="p-4 space-y-6">
                {/* My Status Section */}
                <div className="space-y-3">
                  <span className="text-xs font-mono text-white/50 uppercase tracking-wider block">MY_STATUS</span>
                  <div
                    onClick={() => {
                      if (myMoments.length > 0) {
                        const idx = moments.findIndex((m) => m.id === myMoments[0].id);
                        if (idx !== -1) {
                          setSelectedMomentIndex(idx);
                          setActiveView('player');
                        }
                      } else {
                        setActiveView('create');
                      }
                    }}
                    className="p-3 bg-[#131825] border border-white/10 hover:border-[#00e5ff]/50 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={user?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                          alt="Me"
                          className={`w-12 h-12 rounded-2xl object-cover p-0.5 border-2 ${
                            myMoments.length > 0 ? 'border-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.4)]' : 'border-white/20'
                          }`}
                        />
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveView('create');
                          }}
                          className="absolute -bottom-1 -right-1 p-1 bg-[#00e5ff] text-black rounded-lg shadow-md hover:scale-110 transition-transform"
                          title="Post new Moment"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white group-hover:text-[#00e5ff] transition-colors">My Status</h4>
                        <p className="text-xs font-mono text-white/40">
                          {myMoments.length > 0
                            ? `${myMoments.length} active updates • Tap to view`
                            : 'Tap to add status (Photo, Video, Audio, Link)'}
                        </p>
                      </div>
                    </div>

                    {myMoments.length > 0 && (
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                        {myMoments.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Recent Updates Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white/50 uppercase tracking-wider block">RECENT_MOMENTS_FEED</span>
                    <button
                      onClick={fetchMoments}
                      className="text-[10px] font-mono text-[#00e5ff] hover:underline"
                    >
                      REFRESH
                    </button>
                  </div>

                  {loading ? (
                    <div className="py-12 text-center text-xs font-mono text-white/40 animate-pulse">
                      Loading encrypted status feed...
                    </div>
                  ) : publicMoments.length === 0 ? (
                    <div className="p-6 bg-[#131825]/50 border border-white/5 rounded-2xl text-center space-y-2">
                      <Clock className="w-8 h-8 text-white/20 mx-auto" />
                      <p className="text-xs text-white/50">No recent public moments from other operatives yet.</p>
                      <p className="text-[11px] font-mono text-white/30">Be the first to share a moment or story!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {publicMoments.map((moment) => {
                        const globalIdx = moments.findIndex((m) => m.id === moment.id);
                        return (
                          <div
                            key={moment.id}
                            onClick={() => {
                              setSelectedMomentIndex(globalIdx);
                              setActiveView('player');
                            }}
                            className="p-3 bg-[#131825] border border-white/10 hover:border-[#00e5ff]/50 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="p-0.5 rounded-2xl border-2 border-[#00e5ff] shadow-[0_0_10px_rgba(0,229,255,0.3)]">
                                <img
                                  src={
                                    moment.user?.profilePicture ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${moment.user?.username}`
                                  }
                                  alt={moment.user?.name}
                                  className="w-11 h-11 rounded-xl object-cover bg-slate-900"
                                />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-white group-hover:text-[#00e5ff] transition-colors">
                                  {moment.user?.name || 'Operative'}
                                </h4>
                                <div className="flex items-center space-x-2 text-[11px] font-mono text-white/40">
                                  <span>{new Date(moment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span>•</span>
                                  <span className="capitalize text-cyan-400">{moment.mediaType}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              {moment.privacy === 'private' ? (
                                <span title="Private (Link Only)"><Lock className="w-4 h-4 text-rose-400" /></span>
                              ) : (
                                <span title="Public Status"><Globe className="w-4 h-4 text-emerald-400" /></span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyMomentLink(moment.id);
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                                title="Copy Share Link"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : activeView === 'create' ? (
              /* Create Moment Tab */
              <div className="p-4 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <button
                    onClick={() => setActiveView('feed')}
                    className="text-xs font-mono text-white/60 hover:text-white flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>BACK_TO_FEED</span>
                  </button>
                  <span className="text-xs font-mono font-bold text-[#00e5ff]">CREATE_MOMENT</span>
                </div>

                <form onSubmit={handlePublishMoment} className="space-y-4">
                  {/* Media Type Selector */}
                  <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                    {[
                      { type: 'photo', label: 'Photo', icon: ImageIcon },
                      { type: 'video', label: 'Video', icon: VideoIcon },
                      { type: 'audio', label: 'Audio', icon: Mic },
                      { type: 'text', label: 'Text', icon: Type },
                    ].map((item) => {
                      const IconComp = item.icon;
                      const active = mediaType === item.type;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            setMediaType(item.type as any);
                            setMediaURL('');
                          }}
                          className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                            active
                              ? 'bg-[#00e5ff]/10 border-[#00e5ff] text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                              : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                          <span className="text-[10px]">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Media Upload / Record / Render Preview Area */}
                  <div className="p-4 bg-[#131825] border border-white/10 rounded-2xl flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                    {mediaType === 'photo' && (
                      <>
                        {mediaURL ? (
                          <div className="relative w-full max-h-48 rounded-xl overflow-hidden group">
                            <img src={mediaURL} alt="Upload preview" className="w-full h-48 object-cover rounded-xl" />
                            <button
                              type="button"
                              onClick={() => setMediaURL('')}
                              className="absolute top-2 right-2 p-1.5 bg-black/70 text-rose-400 rounded-lg hover:bg-black transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="cursor-pointer flex flex-col items-center space-y-2 text-white/50 hover:text-[#00e5ff] transition-colors"
                          >
                            <ImageIcon className="w-10 h-10 text-[#00e5ff]" />
                            <span className="text-xs font-mono">Select Photo File</span>
                          </div>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={handleMediaFileChange}
                        />
                      </>
                    )}

                    {mediaType === 'video' && (
                      <>
                        {mediaURL ? (
                          <div className="relative w-full max-h-48 rounded-xl overflow-hidden group">
                            <video src={mediaURL} controls className="w-full h-48 object-cover rounded-xl" />
                            <button
                              type="button"
                              onClick={() => setMediaURL('')}
                              className="absolute top-2 right-2 p-1.5 bg-black/70 text-rose-400 rounded-lg hover:bg-black transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="cursor-pointer flex flex-col items-center space-y-2 text-white/50 hover:text-[#00e5ff] transition-colors"
                          >
                            <VideoIcon className="w-10 h-10 text-[#00e5ff]" />
                            <span className="text-xs font-mono">Select Video File (MP4/WebM)</span>
                          </div>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="video/*"
                          className="hidden"
                          onChange={handleMediaFileChange}
                        />
                      </>
                    )}

                    {mediaType === 'audio' && (
                      <div className="flex flex-col items-center space-y-3 w-full">
                        {mediaURL ? (
                          <div className="w-full space-y-2 text-center">
                            <audio src={mediaURL} controls className="w-full rounded-xl" />
                            <button
                              type="button"
                              onClick={() => setMediaURL('')}
                              className="text-xs font-mono text-rose-400 hover:underline"
                            >
                              Re-record / Remove Audio
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-3">
                            {isRecordingAudio ? (
                              <button
                                type="button"
                                onClick={stopAudioRecording}
                                className="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white font-mono rounded-2xl text-xs flex items-center space-x-2 animate-pulse shadow-lg"
                              >
                                <Mic className="w-5 h-5" />
                                <span>STOP RECORDING ({audioRecordingTime}s)</span>
                              </button>
                            ) : (
                              <div className="flex items-center space-x-3">
                                <button
                                  type="button"
                                  onClick={startAudioRecording}
                                  className="px-4 py-2.5 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold font-mono rounded-xl text-xs flex items-center space-x-2 shadow-lg"
                                >
                                  <Mic className="w-4 h-4" />
                                  <span>RECORD VOICE</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-mono rounded-xl text-xs"
                                >
                                  UPLOAD AUDIO
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="audio/*"
                          className="hidden"
                          onChange={handleMediaFileChange}
                        />
                      </div>
                    )}

                    {mediaType === 'text' && (
                      <div
                        className="w-full h-40 rounded-xl flex items-center justify-center p-4 text-center transition-all"
                        style={{ backgroundColor }}
                      >
                        <p className="text-lg font-bold text-white break-words max-w-xs">
                          {caption || 'Type your status text below...'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Background Color Picker for Text */}
                  {mediaType === 'text' && (
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-white/50">BACKGROUND:</span>
                      {bgColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setBackgroundColor(color)}
                          className={`w-6 h-6 rounded-lg border transition-transform ${
                            backgroundColor === color ? 'scale-125 border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Caption Text Input */}
                  <div>
                    <label className="block mb-1 text-xs font-mono text-white/60">
                      {mediaType === 'text' ? 'Status Message' : 'Caption (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Add a caption or story note..."
                      className="w-full px-3 py-2 bg-[#131825] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white outline-none"
                    />
                  </div>

                  {/* Privacy Selector */}
                  <div className="p-3 bg-[#131825] border border-white/10 rounded-xl space-y-2">
                    <span className="text-[10px] font-mono text-white/50 uppercase block">PRIVACY_CONTROL</span>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setPrivacy('public')}
                        className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                          privacy === 'public'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : 'bg-white/[0.02] border-white/10 text-white/50'
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                        <span>PUBLIC (EVERYONE)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrivacy('private')}
                        className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                          privacy === 'private'
                            ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                            : 'bg-white/[0.02] border-white/10 text-white/50'
                        }`}
                      >
                        <Lock className="w-4 h-4" />
                        <span>PRIVATE (LINK ONLY)</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-white/40 font-mono italic">
                      {privacy === 'public'
                        ? 'Public moments appear in all operatives’ Moments feed.'
                        : 'Private moments are hidden from feed and accessible strictly via share link.'}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={publishing}
                    className="w-full py-3 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold font-mono rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-[0_4px_16px_rgba(0,229,255,0.25)] disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{publishing ? 'PUBLISHING MOMENT...' : 'PUBLISH MOMENT STATUS'}</span>
                  </button>
                </form>
              </div>
            ) : (
              /* Story Player View */
              <div
                className="w-full h-full flex flex-col justify-between relative"
                style={{
                  backgroundColor: currentMoment?.backgroundColor || '#0b0f17',
                }}
              >
                {/* Story Top Progress Bars & User Overlay */}
                <div className="absolute top-0 inset-x-0 p-3 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent space-y-2">
                  <div className="flex items-center space-x-1">
                    {moments.map((m, idx) => (
                      <div key={m.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00e5ff] transition-all duration-100"
                          style={{
                            width:
                              idx === selectedMomentIndex
                                ? `${progress}%`
                                : idx < selectedMomentIndex
                                ? '100%'
                                : '0%',
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={
                          currentMoment?.user?.profilePicture ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentMoment?.user?.username}`
                        }
                        alt="User"
                        className="w-8 h-8 rounded-xl object-cover border border-[#00e5ff]"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white leading-none">
                          {currentMoment?.user?.name || 'Operative'}
                        </h4>
                        <span className="text-[10px] font-mono text-white/60">
                          {currentMoment?.createdAt
                            ? new Date(currentMoment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Play/Pause */}
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-1.5 bg-black/40 text-white rounded-lg hover:bg-black/70 transition-colors"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      {/* Share Link Button */}
                      {currentMoment && (
                        <button
                          onClick={() => handleCopyMomentLink(currentMoment.id)}
                          className="p-1.5 bg-black/40 text-white rounded-lg hover:bg-black/70 transition-colors flex items-center space-x-1 text-xs font-mono"
                          title="Copy Direct Moment Link"
                        >
                          {copiedLink ? <Check className="w-4 h-4 text-[#00e5ff]" /> : <Share2 className="w-4 h-4" />}
                        </button>
                      )}

                      {/* Delete button for author */}
                      {currentMoment && user && currentMoment.userId === user.id && (
                        <button
                          onClick={(e) => handleDeleteMoment(currentMoment.id, e)}
                          className="p-1.5 bg-black/40 text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"
                          title="Delete status"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => setActiveView('feed')}
                        className="p-1.5 bg-black/40 text-white/80 rounded-lg hover:bg-black/70 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Media Main Canvas */}
                <div className="flex-1 flex items-center justify-center relative overflow-hidden my-auto">
                  {/* Left / Right Tap Controls */}
                  <div
                    onClick={handlePrevStory}
                    className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer"
                  />
                  <div
                    onClick={handleNextStory}
                    className="absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer"
                  />

                  {currentMoment?.mediaType === 'photo' && (
                    <img
                      src={currentMoment.mediaURL}
                      alt="Moment"
                      className="w-full h-full object-contain max-h-[75vh]"
                    />
                  )}

                  {currentMoment?.mediaType === 'video' && (
                    <video
                      src={currentMoment.mediaURL}
                      autoPlay
                      controls
                      className="w-full h-full object-contain max-h-[75vh]"
                    />
                  )}

                  {currentMoment?.mediaType === 'audio' && (
                    <div className="p-8 text-center space-y-4">
                      <div className="w-24 h-24 mx-auto rounded-3xl bg-[#00e5ff]/20 border border-[#00e5ff]/50 flex items-center justify-center text-[#00e5ff] animate-pulse">
                        <Mic className="w-12 h-12" />
                      </div>
                      <audio src={currentMoment.mediaURL} autoPlay controls className="mx-auto rounded-xl" />
                    </div>
                  )}

                  {currentMoment?.mediaType === 'text' && (
                    <div className="p-8 text-center max-w-xs">
                      <p className="text-2xl font-bold text-white tracking-wide leading-relaxed">
                        {currentMoment.caption}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Caption & Views Info Overlay */}
                <div className="p-4 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-2 text-center">
                  {currentMoment?.caption && currentMoment.mediaType !== 'text' && (
                    <p className="text-sm font-medium text-white max-w-xs mx-auto drop-shadow-md">
                      {currentMoment.caption}
                    </p>
                  )}

                  <div className="flex items-center justify-center space-x-3 text-xs font-mono text-white/50 pt-1">
                    <span className="flex items-center space-x-1">
                      <Eye className="w-3.5 h-3.5 text-[#00e5ff]" />
                      <span>{currentMoment?.views?.length || 1} VIEWS</span>
                    </span>

                    <span>•</span>

                    <span>{currentMoment?.privacy === 'private' ? 'PRIVATE LINK' : 'PUBLIC STATUS'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
