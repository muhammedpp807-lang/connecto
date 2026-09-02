import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { 
  GameSession, 
  GameInvitation, 
  GameHistoryItem, 
  TicTacToeSymbol,
  ChessDifficulty,
  GameType
} from '../../types';
import { 
  createLocalGameSession, 
  createLocalChessSession,
  getGameHistory, 
  subscribeToGameInvitations 
} from '../../services/gameService';
import { INITIAL_FEN } from '../../services/chessEngine';
import { GamesHome } from './GamesHome';
import { FriendModeChoiceModal } from './FriendModeChoiceModal';
import { OfflineSetupModal } from './OfflineSetupModal';
import { OnlineFriendSelector } from './OnlineFriendSelector';
import { TicTacToeGame } from './TicTacToeGame';
import { ChessGame } from './chess/ChessGame';
import { ChessRobotSetupModal } from './chess/ChessRobotSetupModal';
import { ChessOfflineSetupModal } from './chess/ChessOfflineSetupModal';
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

  // Selected game mode context
  const [selectedGameType, setSelectedGameType] = useState<GameType>('chess');

  // Modals state
  const [showFriendChoice, setShowFriendChoice] = useState(false);
  const [showTicTacToeOfflineSetup, setShowTicTacToeOfflineSetup] = useState(false);
  const [showChessRobotSetup, setShowChessRobotSetup] = useState(false);
  const [showChessOfflineSetup, setShowChessOfflineSetup] = useState(false);
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
          const isChess = accepted.gameType === 'chess';
          const timerMs = 10 * 60 * 1000;

          setActiveSession({
            id: accepted.gameId,
            gameType: accepted.gameType,
            mode: 'online',
            playerX: accepted.senderId,
            playerO: accepted.receiverId,
            playerWhite: accepted.senderId,
            playerBlack: accepted.receiverId,
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
            playerWhiteInfo: {
              uid: accepted.senderId,
              displayName: accepted.senderName,
              photoURL: accepted.senderAvatar,
              username: accepted.senderUsername
            },
            playerBlackInfo: {
              uid: accepted.receiverId,
              displayName: accepted.receiverName || 'Friend'
            },
            board: isChess ? [] : ['', '', '', '', '', '', '', '', ''],
            fen: isChess ? INITIAL_FEN : undefined,
            pgn: isChess ? '' : undefined,
            chessMoveHistory: [],
            timerInitialMinutes: isChess ? 10 : undefined,
            whiteTimeRemaining: isChess ? timerMs : undefined,
            blackTimeRemaining: isChess ? timerMs : undefined,
            isClockActive: isChess,
            lastMoveTimestamp: Date.now(),
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

  // Handler: Start Tic-Tac-Toe Robot AI
  const handleStartTicTacToeRobot = () => {
    const session = createLocalGameSession(
      'robot',
      profile?.displayName || 'You',
      'Robot AI',
      profile?.photoURL,
      undefined,
      profile?.uid || 'player1',
      'robot'
    );
    setActiveSession(session);
  };

  // Handler: Start Tic-Tac-Toe Offline Pass & Play
  const handleStartTicTacToeOffline = (p1Name: string, p2Name: string, p1Symbol: TicTacToeSymbol) => {
    const pXName = p1Symbol === 'X' ? p1Name : p2Name;
    const pOName = p1Symbol === 'X' ? p2Name : p1Name;

    const session = createLocalGameSession(
      'offline',
      pXName,
      pOName,
      p1Symbol === 'X' ? profile?.photoURL : undefined,
      p1Symbol === 'O' ? profile?.photoURL : undefined,
      p1Symbol === 'X' ? (profile?.uid || 'player1') : 'player2',
      p1Symbol === 'X' ? 'player2' : (profile?.uid || 'player1')
    );
    setShowTicTacToeOfflineSetup(false);
    setActiveSession(session);
  };

  // Handler: Start Chess Robot Game
  const handleStartChessRobot = (difficulty: ChessDifficulty, playerColor: 'w' | 'b', timerMinutes?: number) => {
    const session = createLocalChessSession(
      'robot',
      profile?.displayName || 'You',
      `Robot (${difficulty.toUpperCase()})`,
      profile?.photoURL,
      undefined,
      profile?.uid || 'player1',
      'robot',
      playerColor,
      difficulty,
      timerMinutes
    );
    setShowChessRobotSetup(false);
    setActiveSession(session);
  };

  // Handler: Start Chess Offline Game
  const handleStartChessOffline = (p1Name: string, p2Name: string, p1Color: 'w' | 'b', timerMinutes?: number) => {
    const session = createLocalChessSession(
      'offline',
      p1Name,
      p2Name,
      p1Color === 'w' ? profile?.photoURL : undefined,
      p1Color === 'b' ? profile?.photoURL : undefined,
      p1Color === 'w' ? (profile?.uid || 'player1') : 'player2',
      p1Color === 'w' ? 'player2' : (profile?.uid || 'player1'),
      p1Color,
      'medium',
      timerMinutes
    );
    setShowChessOfflineSetup(false);
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

  // If inside an active game session, render the appropriate game!
  if (activeSession) {
    if (activeSession.gameType === 'chess') {
      return (
        <ChessGame
          gameId={activeSession.id}
          onExit={handleBackToGames}
        />
      );
    }

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
        onSelectTicTacToeRobot={handleStartTicTacToeRobot}
        onSelectTicTacToeFriends={() => {
          setSelectedGameType('tic-tac-toe');
          setShowFriendChoice(true);
        }}
        onSelectChessRobot={() => setShowChessRobotSetup(true)}
        onSelectChessFriends={() => {
          setSelectedGameType('chess');
          setShowFriendChoice(true);
        }}
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
        onSelectOffline={() => {
          setShowFriendChoice(false);
          if (selectedGameType === 'chess') {
            setShowChessOfflineSetup(true);
          } else {
            setShowTicTacToeOfflineSetup(true);
          }
        }}
        onSelectOnline={() => {
          setShowFriendChoice(false);
          setShowOnlineSelector(true);
        }}
      />

      {/* Tic-Tac-Toe Offline Setup Modal */}
      <OfflineSetupModal
        isOpen={showTicTacToeOfflineSetup}
        onClose={() => setShowTicTacToeOfflineSetup(false)}
        onStartGame={handleStartTicTacToeOffline}
        defaultP1Name={profile?.displayName || 'Player 1'}
      />

      {/* Chess Robot AI Setup Modal */}
      <ChessRobotSetupModal
        isOpen={showChessRobotSetup}
        onClose={() => setShowChessRobotSetup(false)}
        onStartGame={handleStartChessRobot}
      />

      {/* Chess Offline Pass & Play Setup Modal */}
      <ChessOfflineSetupModal
        isOpen={showChessOfflineSetup}
        onClose={() => setShowChessOfflineSetup(false)}
        onStartGame={handleStartChessOffline}
        defaultP1Name={profile?.displayName || 'Player 1'}
      />

      {/* Online Friend Invite Selector Modal */}
      <OnlineFriendSelector
        isOpen={showOnlineSelector}
        onClose={() => setShowOnlineSelector(false)}
        onInvitationSent={() => {}}
        activeInvitations={activeInvitations}
        gameType={selectedGameType}
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
