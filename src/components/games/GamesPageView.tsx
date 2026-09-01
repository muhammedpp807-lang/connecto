import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { 
  GameSession, 
  GameInvitation, 
  GameHistoryItem, 
  TicTacToeSymbol 
} from '../../types';
import { 
  createLocalGameSession, 
  getGameHistory, 
  subscribeToGameInvitations 
} from '../../services/gameService';
import { GamesHome } from './GamesHome';
import { FriendModeChoiceModal } from './FriendModeChoiceModal';
import { OfflineSetupModal } from './OfflineSetupModal';
import { OnlineFriendSelector } from './OnlineFriendSelector';
import { TicTacToeGame } from './TicTacToeGame';
import { GameHistoryModal } from './GameHistoryModal';

interface GamesPageViewProps {
  initialGameSession?: GameSession | null;
  onClearInitialGame?: () => void;
}

export const GamesPageView: React.FC<GamesPageViewProps> = ({
  initialGameSession = null,
  onClearInitialGame
}) => {
  const { profile } = useAuth();
  const { showToast } = useNotifications();

  // Active game session
  const [activeSession, setActiveSession] = useState<GameSession | null>(initialGameSession);

  // Modals state
  const [showFriendChoice, setShowFriendChoice] = useState(false);
  const [showOfflineSetup, setShowOfflineSetup] = useState(false);
  const [showOnlineSelector, setShowOnlineSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Invitations & History
  const [activeInvitations, setActiveInvitations] = useState<GameInvitation[]>([]);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);

  useEffect(() => {
    if (initialGameSession) {
      setActiveSession(initialGameSession);
    }
  }, [initialGameSession]);

  // Load history & subscribe to invitations
  useEffect(() => {
    if (profile?.uid) {
      setHistory(getGameHistory(profile.uid));

      const unsub = subscribeToGameInvitations(profile.uid, (invs) => {
        setActiveInvitations(invs);
        // Check if any sent invitation was just accepted
        const accepted = invs.find(
          (i) => i.senderId === profile.uid && i.status === 'accepted' && Date.now() - i.createdAt < 120000
        );
        if (accepted && !activeSession) {
          // Join the game!
          setActiveSession({
            id: accepted.gameId,
            gameType: accepted.gameType,
            mode: 'online',
            playerX: accepted.senderId,
            playerO: accepted.receiverId,
            playerXInfo: {
              uid: accepted.senderId,
              displayName: accepted.senderName,
              photoURL: accepted.senderAvatar,
              username: accepted.senderUsername
            },
            playerOInfo: {
              uid: accepted.receiverId,
              displayName: accepted.receiverName || 'Friend'
            },
            board: ['', '', '', '', '', '', '', '', ''],
            currentTurn: accepted.senderId,
            currentSymbol: 'X',
            starter: accepted.senderId,
            starterSymbol: 'X',
            round: 1,
            status: 'active',
            winner: null,
            winningLine: null,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          setShowOnlineSelector(false);
        }
      });

      return () => unsub();
    }
  }, [profile?.uid, activeSession]);

  // Handler: Play with Robot AI
  const handleStartRobotGame = () => {
    const session = createLocalGameSession(
      'robot',
      profile?.displayName || 'You',
      'Robot AI',
      profile?.photoURL,
      undefined,
      'player1',
      'robot'
    );
    setActiveSession(session);
  };

  // Handler: Start Offline Pass & Play
  const handleStartOfflineGame = (p1Name: string, p2Name: string, p1Symbol: TicTacToeSymbol) => {
    // If P1 chose 'X', P1 is playerX and starts. If P1 chose 'O', P2 is playerX and starts.
    const pXName = p1Symbol === 'X' ? p1Name : p2Name;
    const pOName = p1Symbol === 'X' ? p2Name : p1Name;

    const session = createLocalGameSession(
      'offline',
      pXName,
      pOName,
      p1Symbol === 'X' ? profile?.photoURL : undefined,
      p1Symbol === 'O' ? profile?.photoURL : undefined,
      p1Symbol === 'X' ? 'player1' : 'player2',
      p1Symbol === 'X' ? 'player2' : 'player1'
    );
    setShowOfflineSetup(false);
    setActiveSession(session);
  };

  // Handler: Return to Games Home
  const handleBackToGames = () => {
    setActiveSession(null);
    if (onClearInitialGame) onClearInitialGame();
    if (profile?.uid) {
      setHistory(getGameHistory(profile.uid));
    }
  };

  // If inside an active game session, render the game!
  if (activeSession) {
    return (
      <TicTacToeGame
        gameId={activeSession.id}
        initialSession={activeSession}
        onBackToGames={handleBackToGames}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">
      <GamesHome
        onSelectRobot={handleStartRobotGame}
        onSelectFriends={() => setShowFriendChoice(true)}
        onViewHistory={() => {
          if (profile?.uid) setHistory(getGameHistory(profile.uid));
          setShowHistory(true);
        }}
        history={history}
      />

      {/* Choice Modal: Offline vs Online */}
      <FriendModeChoiceModal
        isOpen={showFriendChoice}
        onClose={() => setShowFriendChoice(false)}
        onSelectOffline={() => setShowOfflineSetup(true)}
        onSelectOnline={() => setShowOnlineSelector(true)}
      />

      {/* Offline Pass & Play Setup Modal */}
      <OfflineSetupModal
        isOpen={showOfflineSetup}
        onClose={() => setShowOfflineSetup(false)}
        onStartGame={handleStartOfflineGame}
        defaultP1Name={profile?.displayName || 'Player 1'}
      />

      {/* Online Friend Invite Selector Modal */}
      <OnlineFriendSelector
        isOpen={showOnlineSelector}
        onClose={() => setShowOnlineSelector(false)}
        onInvitationSent={(inv) => {
          // keep open or notify
        }}
        activeInvitations={activeInvitations}
      />

      {/* Game Match History Modal */}
      <GameHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
      />
    </div>
  );
};
