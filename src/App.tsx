import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroLanding from './components/HeroLanding';
import IndiaLandingExperience from './components/IndiaLandingExperience';
import TravelerWorkspace from './components/TravelerWorkspace';
import DestinationExplorer from './components/DestinationExplorer';
import CatalogueExplorer from './components/CatalogueExplorer';
import AIChatConsole from './components/AIChatConsole';
import CreateTripModal from './components/CreateTripModal';
import DynamicBackground, { BACKGROUND_SCENES } from './components/DynamicBackground';
import { OperatorPortal } from './components/operator/OperatorPortal';
import { Destination, Trip } from './types/tourflow';
import { TourFlowApi } from './services/api';

export default function App() {
  const [isOperatorMode, setIsOperatorMode] = useState<boolean>(() => {
    return window.location.pathname.startsWith('/operator') || window.location.search.includes('portal=operator');
  });
  const [activeTab, setActiveTab] = useState<'landing' | 'workspace' | 'destinations' | 'catalog' | 'ai_console'>('landing');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestinationSlug, setSelectedDestinationSlug] = useState<string>('manali');
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [initialPrefData, setInitialPrefData] = useState<Record<string, any> | undefined>(undefined);
  const [initialDestId, setInitialDestId] = useState<string | undefined>(undefined);

  // Listen to browser navigation changes
  useEffect(() => {
    const handlePopState = () => {
      setIsOperatorMode(window.location.pathname.startsWith('/operator') || window.location.search.includes('portal=operator'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSwitchToOperator = () => {
    setIsOperatorMode(true);
    window.history.pushState({}, '', '/operator/dashboard');
  };

  const handleSwitchToTraveler = () => {
    setIsOperatorMode(false);
    window.history.pushState({}, '', '/');
  };

  // Dynamic Background Scene State
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
  const [isImmersiveMode, setIsImmersiveMode] = useState<boolean>(false);

  const [chatInitialPrompt, setChatInitialPrompt] = useState<string>('');
  const [chatInitialDestination, setChatInitialDestination] = useState<string | undefined>(undefined);
  const [chatInitialDuration, setChatInitialDuration] = useState<string | undefined>(undefined);
  const [chatInitialPayload, setChatInitialPayload] = useState<any>(null);

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    try {
      const data = await TourFlowApi.getDestinations();
      setDestinations(data);
    } catch (e) {
      console.error('Failed to load initial destinations', e);
    }
  };

  const handleSelectDestinationFromHero = (dest: Destination) => {
    setSelectedDestinationSlug(dest.slug);
    // Find matching background scene index
    const matchedIndex = BACKGROUND_SCENES.findIndex((s) => s.slug === dest.slug || s.title.toLowerCase().includes(dest.name.toLowerCase()));
    if (matchedIndex !== -1) {
      setCurrentSceneIndex(matchedIndex);
    }
    setActiveTab('destinations');
  };

  const handlePlanTripForDestination = (dest: Destination) => {
    setEditingTrip(null);
    setInitialDestId(dest.id);
    setInitialPrefData(undefined);
    setIsCreateTripModalOpen(true);
  };

  const handleQuickPlanFromBackground = (slug: string) => {
    const dest = destinations.find((d) => d.slug === slug) || destinations[0];
    if (dest) {
      handlePlanTripForDestination(dest);
    } else {
      setEditingTrip(null);
      setIsCreateTripModalOpen(true);
    }
  };

  const handleStartChatWithPrompt = (prompt: string, initialParams?: { destination?: string; duration?: string }) => {
    setChatInitialPayload(null);
    setChatInitialPrompt(prompt);
    setChatInitialDestination(initialParams?.destination);
    setChatInitialDuration(initialParams?.duration);
    setActiveTab('ai_console');
  };

  const handleStartChatWithPayload = (payload: any) => {
    setChatInitialPayload(payload);
    setChatInitialPrompt('');
    setChatInitialDestination(payload.destination);
    setChatInitialDuration(payload.durationDays ? `${payload.durationDays} days` : undefined);
    setActiveTab('ai_console');
    setIsCreateTripModalOpen(false);
  };

  const handleExitChat = (targetTab: 'landing' | 'workspace' = 'landing') => {
    setChatInitialPrompt('');
    setChatInitialDestination(undefined);
    setChatInitialDuration(undefined);
    setChatInitialPayload(null);
    TourFlowApi.clearActiveSession();
    setActiveTab(targetTab);
  };

  const handleAutoFillFromAI = (extracted: Record<string, any>) => {
    setEditingTrip(null);
    setInitialPrefData(extracted);
    setIsCreateTripModalOpen(true);
  };

  const handleOpenEditPreferences = (trip: Trip) => {
    setEditingTrip(trip);
    setIsCreateTripModalOpen(true);
  };

  const handleTripCreatedOrUpdated = (_trip: Trip) => {
    setActiveTab('workspace');
  };

  // If in Operator Mode, render dedicated Operator Enterprise Suite safely after all hooks
  if (isOperatorMode) {
    return <OperatorPortal onSwitchToTraveler={handleSwitchToTraveler} />;
  }

  return (
    <DynamicBackground
      currentSceneIndex={currentSceneIndex}
      onSceneChange={setCurrentSceneIndex}
      isAutoPlaying={isAutoPlaying}
      onToggleAutoPlay={() => setIsAutoPlaying((prev) => !prev)}
      onQuickPlanDestination={handleQuickPlanFromBackground}
      isImmersiveMode={isImmersiveMode}
      onToggleImmersiveMode={() => setIsImmersiveMode((prev) => !prev)}
      isLandingView={activeTab === 'landing'}
    >
      <div className="min-h-screen text-stone-900 flex flex-col font-sans selection:bg-[#7065F0] selection:text-white">
        
        {/* Top Main Navigation for secondary tabs (except chat which has its native WonderAi header) */}
        {activeTab !== 'landing' && activeTab !== 'ai_console' && (
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenCreateTrip={() => {
              setEditingTrip(null);
              setInitialPrefData(undefined);
              setInitialDestId(undefined);
              setIsCreateTripModalOpen(true);
            }}
            onSwitchToOperator={handleSwitchToOperator}
          />
        )}

        {/* Main App Content Body */}
        <main className={`flex-1 transition-all duration-500 ${isImmersiveMode ? 'opacity-30 hover:opacity-100' : 'opacity-100'}`}>
          {activeTab === 'landing' && (
            <>
              <HeroLanding
                destinations={destinations}
                onSelectDestination={handleSelectDestinationFromHero}
                onOpenCreateTrip={() => {
                  setEditingTrip(null);
                  setIsCreateTripModalOpen(true);
                }}
                onExploreWorkspace={() => setActiveTab('workspace')}
                onStartChatWithPrompt={handleStartChatWithPrompt}
                onNavigateTab={setActiveTab}
                onSwitchToOperator={handleSwitchToOperator}
              />
              <IndiaLandingExperience
                destinations={destinations}
                currentScene={BACKGROUND_SCENES[currentSceneIndex]}
                onSelectDestination={handleSelectDestinationFromHero}
                onOpenCreateTrip={() => {
                  setEditingTrip(null);
                  setIsCreateTripModalOpen(true);
                }}
                onStartChatWithPrompt={handleStartChatWithPrompt}
                onNavigateTab={setActiveTab}
                onSwitchToOperator={handleSwitchToOperator}
              />
            </>
          )}

          {activeTab === 'workspace' && (
            <TravelerWorkspace
              onOpenCreateTrip={() => {
                setEditingTrip(null);
                setIsCreateTripModalOpen(true);
              }}
              onOpenEditPreferences={handleOpenEditPreferences}
            />
          )}

          {activeTab === 'destinations' && (
            <DestinationExplorer
              initialDestinationSlug={selectedDestinationSlug}
              onPlanTripForDestination={handlePlanTripForDestination}
              onStartChatWithPrompt={handleStartChatWithPrompt}
            />
          )}

          {activeTab === 'catalog' && (
            <CatalogueExplorer
              onStartChatWithPrompt={handleStartChatWithPrompt}
              onOpenCreateTrip={() => {
                setEditingTrip(null);
                setIsCreateTripModalOpen(true);
              }}
            />
          )}

          {activeTab === 'ai_console' && (
            <AIChatConsole
              initialPrompt={chatInitialPrompt}
              initialDestination={chatInitialDestination}
              initialDuration={chatInitialDuration}
              initialPayload={chatInitialPayload}
              destinations={destinations}
              onAutoFillTrip={handleAutoFillFromAI}
              onOpenEditPreferences={handleOpenEditPreferences}
              onNavigateToWorkspace={() => handleExitChat('workspace')}
              onBackToHome={() => handleExitChat('landing')}
            />
          )}
        </main>

        {/* Footer */}
        {activeTab !== 'landing' && activeTab !== 'ai_console' && (
          <footer className="bg-white/80 backdrop-blur-md border-t border-stone-200/80 py-6 text-center text-xs text-stone-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-stone-900 text-sm">WonderAi<span className="text-[#7065F0]">.</span></span>
                <span>&bull;</span>
                <span className="text-stone-600 font-semibold">Where do you want to go?</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Live Scenic Backdrops &bull; PostgreSQL Central Entity &bull; Gemini AI Engine
              </p>
            </div>
          </footer>
        )}

        {/* Interactive Trip Creation / Preference Modal */}
        <CreateTripModal
          isOpen={isCreateTripModalOpen}
          onClose={() => setIsCreateTripModalOpen(false)}
          destinations={destinations}
          initialDestinationId={initialDestId}
          initialPreferences={initialPrefData}
          editingTrip={editingTrip}
          onTripCreatedOrUpdated={handleTripCreatedOrUpdated}
          onStartChatWithTripPayload={handleStartChatWithPayload}
        />

      </div>
    </DynamicBackground>
  );
}
