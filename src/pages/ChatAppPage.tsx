import React, { useState } from 'react';
import { Sidebar } from '../components/chat/Sidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { UserProfile, Conversation } from '../types';
import { SEO } from '../components/common/SEO';
import { useTheme } from '../contexts/ThemeContext';

export const ChatAppPage: React.FC = () => {
  const { appBackground, customAppWallpaper } = useTheme();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  const handleSelectConversation = (
    conversationId: string, 
    recipient?: UserProfile,
    conversation?: Conversation
  ) => {
    setSelectedConversationId(conversationId);
    setSelectedRecipient(recipient || null);
    setSelectedConversation(conversation || null);
    setMobileView('chat');
  };

  const handleBackMobile = () => {
    setMobileView('sidebar');
  };

  const handleLeaveGroup = () => {
    setSelectedConversationId(null);
    setSelectedRecipient(null);
    setSelectedConversation(null);
    setMobileView('sidebar');
  };

  const titleHeader = selectedConversation?.isGroup
    ? `${selectedConversation.groupName} – Connecto Group`
    : selectedRecipient
    ? `${selectedRecipient.displayName} – Connecto Chat`
    : 'Connecto – Real-Time Messaging & Groups';

  return (
    <div
      style={
        customAppWallpaper
          ? {
              backgroundImage: `url(${customAppWallpaper})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
      className={`h-screen w-screen flex overflow-hidden transition-colors ${
        customAppWallpaper
          ? ''
          : appBackground === 'slate'
          ? 'bg-slate-200 dark:bg-[#161b22]'
          : appBackground === 'deep_dark'
          ? 'bg-[#06080d]'
          : appBackground === 'warm_soft'
          ? 'bg-[#f7f5f0] dark:bg-[#181614]'
          : appBackground === 'aurora'
          ? 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white'
          : appBackground === 'oled_black'
          ? 'bg-black text-white'
          : appBackground === 'nebula_glow'
          ? 'bg-gradient-to-br from-[#0c0d21] via-[#1a0f2e] to-[#0a1128] text-white'
          : appBackground === 'forest_mist'
          ? 'bg-gradient-to-br from-[#071d18] via-[#0d2818] to-[#04151f] text-white'
          : appBackground === 'cyber_grid'
          ? 'bg-[#050b14] bg-[linear-gradient(to_right,#0c2340_1px,transparent_1px),linear-gradient(to_bottom,#0c2340_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] text-white'
          : appBackground === 'sunset_dream'
          ? 'bg-gradient-to-br from-[#2a0845] via-[#6441a5] to-[#fe8c00] text-white'
          : 'bg-slate-100 dark:bg-[#0a0c12]'
      }`}
    >
      <SEO title={titleHeader} />

      {/* Sidebar Container */}
      <div
        className={`w-full md:w-80 lg:w-96 h-full flex-shrink-0 transition-all duration-300 ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        <Sidebar
          onSelectConversation={handleSelectConversation}
          selectedId={selectedConversationId}
        />
      </div>

      {/* Chat Area Container */}
      <div
        className={`flex-1 h-full transition-all duration-300 ${
          mobileView === 'sidebar' ? 'hidden md:flex' : 'flex'
        }`}
      >
        <ChatArea
          conversationId={selectedConversationId}
          recipient={selectedRecipient}
          conversation={selectedConversation}
          onBackMobile={handleBackMobile}
          onLeaveGroup={handleLeaveGroup}
        />
      </div>
    </div>
  );
};
