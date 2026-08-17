import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ChatProvider, useChat } from './context/ChatContext.tsx';
import { WelcomeView } from './components/auth/WelcomeView.tsx';
import { LoginModal } from './components/auth/LoginModal.tsx';
import { SignupModal } from './components/auth/SignupModal.tsx';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal.tsx';
import { Sidebar } from './components/dashboard/Sidebar.tsx';
import { ChatArea } from './components/dashboard/ChatArea.tsx';
import { NewChatModal } from './components/dashboard/NewChatModal.tsx';
import { NewGroupChatModal } from './components/dashboard/NewGroupChatModal.tsx';
import { UserProfileModal } from './components/dashboard/UserProfileModal.tsx';
import { CipherPlaygroundModal } from './components/dashboard/CipherPlaygroundModal.tsx';
import { MomentsModal } from './components/dashboard/MomentsModal.tsx';
import { MediaRoomModal } from './components/dashboard/MediaRoomModal.tsx';
import { QRScannerModal } from './components/dashboard/QRScannerModal.tsx';
import { GlobalErrorNotification } from './components/common/GlobalErrorNotification.tsx';

const DashboardContent: React.FC = () => {
  const { startChatWithUser, activeChat } = useChat();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'security' | 'qrcode' | 'backup' | 'diagnostics'>('profile');
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [isMomentsOpen, setIsMomentsOpen] = useState(false);
  const [initialMomentId, setInitialMomentId] = useState<string | null>(null);
  const [isMediaRoomOpen, setIsMediaRoomOpen] = useState(false);
  const [initialRoomId, setInitialRoomId] = useState<string | null>(null);

  const handleOpenProfile = (tab: 'profile' | 'security' | 'qrcode' | 'backup' | 'diagnostics' = 'profile') => {
    setProfileInitialTab(tab);
    setIsProfileOpen(true);
  };

  const handleQRScanSuccess = (scannedText: string) => {
    let target = scannedText.trim();
    if (target.includes('chatWith=')) {
      const match = target.match(/chatWith=([^&]+)/);
      if (match && match[1]) {
        target = match[1];
      }
    }
    
    if (target) {
      setIsQRScannerOpen(false);
      setIsNewChatOpen(false);
      startChatWithUser(target).catch((err) => console.error("Error connecting via QR:", err));
    }
  };

  // Check URL query parameters for share links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chatWithUser = params.get('chatWith');
    const sharedMoment = params.get('moment');
    const sharedRoom = params.get('room');

    if (chatWithUser) {
      startChatWithUser(chatWithUser).catch(() => {});
    }

    if (sharedMoment) {
      setInitialMomentId(sharedMoment);
      setIsMomentsOpen(true);
    }

    if (sharedRoom) {
      setInitialRoomId(sharedRoom);
      setIsMediaRoomOpen(true);
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden font-sans text-slate-100">
      {/* Sidebar - Shown on mobile when no chat selected, or always on desktop (md:) */}
      <div className={`h-full w-full md:w-80 shrink-0 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <Sidebar
          onOpenNewChat={() => setIsNewChatOpen(true)}
          onOpenQRScanner={() => setIsQRScannerOpen(true)}
          onOpenNewGroup={() => setIsNewGroupOpen(true)}
          onOpenProfile={handleOpenProfile}
          onOpenCipherPlayground={() => setIsPlaygroundOpen(true)}
          onOpenMoments={() => {
            setInitialMomentId(null);
            setIsMomentsOpen(true);
          }}
          onOpenMediaRoom={() => {
            setInitialRoomId(null);
            setIsMediaRoomOpen(true);
          }}
        />
      </div>

      {/* Main Chat Area - Shown on mobile when chat selected, or always on desktop (md:) */}
      <div className={`h-full flex-1 min-w-0 ${activeChat ? 'flex' : 'hidden md:flex'}`}>
        <ChatArea onOpenSecuritySettings={() => handleOpenProfile('security')} />
      </div>

      {/* Modals */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onOpenScanner={() => setIsQRScannerOpen(true)}
      />

      <NewGroupChatModal
        isOpen={isNewGroupOpen}
        onClose={() => setIsNewGroupOpen(false)}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        initialTab={profileInitialTab}
        onClose={() => setIsProfileOpen(false)}
      />

      <CipherPlaygroundModal
        isOpen={isPlaygroundOpen}
        onClose={() => setIsPlaygroundOpen(false)}
      />

      <MomentsModal
        isOpen={isMomentsOpen}
        onClose={() => {
          setIsMomentsOpen(false);
          setInitialMomentId(null);
        }}
        initialMomentId={initialMomentId}
      />

      <MediaRoomModal
        isOpen={isMediaRoomOpen}
        onClose={() => {
          setIsMediaRoomOpen(false);
          setInitialRoomId(null);
        }}
        initialRoomId={initialRoomId}
      />

      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanSuccess={handleQRScanSuccess}
      />

      {/* Global Architecture Error Toast Banner */}
      <GlobalErrorNotification onOpenDiagnostics={() => handleOpenProfile('diagnostics')} />
    </div>
  );
};


const MainAppContent: React.FC = () => {
  const { user, loading } = useAuth();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <span className="text-xs font-mono text-emerald-400 font-bold">Initializing Gossip Engine...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <GlobalErrorNotification />
        <WelcomeView
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenSignup={() => setIsSignupOpen(true)}
        />

        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onSwitchToSignup={() => {
            setIsLoginOpen(false);
            setIsSignupOpen(true);
          }}
          onOpenForgotPassword={() => {
            setIsLoginOpen(false);
            setIsForgotPasswordOpen(true);
          }}
        />

        <SignupModal
          isOpen={isSignupOpen}
          onClose={() => setIsSignupOpen(false)}
          onSwitchToLogin={() => {
            setIsSignupOpen(false);
            setIsLoginOpen(true);
          }}
        />

        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
          onSwitchToLogin={() => {
            setIsForgotPasswordOpen(false);
            setIsLoginOpen(true);
          }}
        />
      </>
    );
  }

  return (
    <ChatProvider>
      <DashboardContent />
    </ChatProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
