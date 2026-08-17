import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send } from 'lucide-react';

interface AudioRecorderProps {
  onSendAudio: (audioDataUrl: string, durationSec: number) => void;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSendAudio, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioBlobUrl(base64data);
        };

        // Stop audio track streams
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Could not access microphone. Please check permission settings.');
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = () => {
    if (audioBlobUrl) {
      onSendAudio(audioBlobUrl, recordingTime);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center justify-between p-2.5 bg-slate-900/95 border border-[#00e5ff]/30 rounded-2xl shadow-xl w-full">
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center">
          <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping absolute" />
          <div className="w-3 h-3 bg-rose-500 rounded-full z-10" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-rose-400 font-mono flex items-center gap-1">
            <Mic className="w-3.5 h-3.5 animate-pulse" /> Recording Voice Note...
          </span>
          <span className="text-sm font-mono text-white font-bold">{formatTime(recordingTime)}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="p-2 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-xl transition-colors border border-rose-500/30 text-xs font-medium flex items-center space-x-1"
            title="Stop recording"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Done</span>
          </button>
        ) : (
          audioBlobUrl && (
            <button
              onClick={handleSend}
              className="p-2 bg-[#00e5ff] text-slate-950 font-bold hover:bg-[#00e5ff]/90 rounded-xl transition-all shadow-[0_0_15px_rgba(0,229,255,0.4)] flex items-center space-x-1 text-xs"
            >
              <Send className="w-4 h-4" />
              <span>Send Voice</span>
            </button>
          )
        )}

        <button
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          title="Cancel"
        >
          <Trash2 className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
