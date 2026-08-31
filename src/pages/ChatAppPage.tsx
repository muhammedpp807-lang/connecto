import React, { useState, useEffect } from 'react';
import { NavRail, AppNavTab } from '../components/navigation/NavRail';
import { Sidebar } from '../components/chat/Sidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { StatusPageView } from '../components/status/StatusPageView';
import { SettingsPageView } from '../components/settings/SettingsPageView';
import { ProfilePageView } from '../components/profile/ProfilePageView';
import { ContactsPageView } from '../components/contacts/ContactsPageView';
import { HelpModal } from '../components/common/HelpModal';
import { UserProfile, Conversation } from '../types';
import { SEO } from '../components/common/SEO';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToConversations } from '../services/chatService';
import { subscribeToStatuses } from '../services/statusService';

export const ChatAppPage: React.FC = () => {
  const { profile } = useAuth();
  const { appBackground, customAppWallpaper } = useTheme();

  const [activeTab, setActiveTab] = useState<AppNavTab>('chats');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Real-time unread badges & status counts
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeStatusesCount, setActiveStatusesCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    const unsubConvs = subscribeToConversations(profile.uid, (convs) => {
      let total = 0;
      convs.forEach((c) => {
        const u = c.unreadCount?.[profile.uid] || 0;
        total += u;
      });
      setUnreadCount(total);
    });

    const unsubStatus = subscribeToStatuses(profile.uid, (groups) => {
      let count = 0;
      groups.forEach((g) => {
        count += g.statuses.length;
      });
      setActiveStatusesCount(count);
    });

    return () => {
      unsubConvs();
      unsubStatus();
    };
  }, [profile]);

  const handleSelectConversation = (
    conversationId: string, 
    recipient?: UserProfile,
    conversation?: Conversation
  ) => {
    setSelectedConversationId(conversationId);
    setSelectedRecipient(recipient || null);
    setSelectedConversation(conversation || null);
    setMobileView('chat');
    setActiveTab('chats');
  };

  const handleStartChatFromContacts = (conversationId: string, recipient: UserProfile) => {
    setSelectedConversationId(conversationId);
    setSelectedRecipient(recipient);
    setSelectedConversation(null);
    setMobileView('chat');
    setActiveTab('chats');
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

  const titleHeader = activeTab === 'status'
    ? 'Pulse – Status Updates'
    : activeTab === 'settings'
    ? 'Pulse – Settings & Preferences'
    : activeTab === 'profile'
    ? 'Pulse – User Profile'
    : activeTab === 'contacts'
    ? 'Pulse – Contacts & Directory'
    : selectedConversation?.isGroup
    ? `${selectedConversation.groupName} – Pulse Group`
    : selectedRecipient
    ? `${selectedRecipient.displayName} – Pulse Chat`
    : 'Pulse – Real-Time Messaging & Status';

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
      className={`h-screen w-screen flex overflow-hidden bg-[#efeae2] dark:bg-[#0b141a] text-slate-900 dark:text-slate-100 transition-colors`}
    >
      <SEO title={titleHeader} />

      {/* 1. Leftmost Vertical Nav Rail (Pulse) */}
      <NavRail
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'chats') {
            setMobileView('sidebar');
          }
        }}
        unreadChatsCount={unreadCount}
        activeStatusCount={activeStatusesCount}
        onOpenHelp={() => setShowHelpModal(true)}
      />

      {/* 2. Main Content Area depending on Active Tab */}
      <div className="flex-1 h-full flex overflow-hidden">
        {/* Tab A: Chats (Left Sidebar list + Right Conversation area) */}
        {activeTab === 'chats' && (
          <div className="w-full h-full flex overflow-hidden">
            {/* Chats List Sidebar */}
            <div
              className={`w-full md:w-80 lg:w-[380px] h-full flex-shrink-0 transition-all duration-300 ${
                mobileView === 'chat' ? 'hidden md:flex' : 'flex'
              }`}
            >
              <Sidebar
                onSelectConversation={handleSelectConversation}
                selectedId={selectedConversationId}
              />
            </div>

            {/* Active Conversation / Empty state */}
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
        )}

        {/* Tab B: Status Screen (WhatsApp Style) */}
        {activeTab === 'status' && <StatusPageView />}

        {/* Tab C: Contacts Screen */}
        {activeTab === 'contacts' && (
          <ContactsPageView onStartChat={handleStartChatFromContacts} />
        )}

        {/* Tab D: Settings Screen */}
        {activeTab === 'settings' && <SettingsPageView />}

        {/* Tab E: Profile Screen */}
        {activeTab === 'profile' && <ProfilePageView />}
      </div>

      {/* Help Modal */}
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
    </div>
  );
};

