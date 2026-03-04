import { useState } from 'react';
import type { ViewType } from './types';
import { useConversations } from './hooks/useConversations';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import ChatView from './components/Chat/ChatView';
import KnowledgeView from './components/Knowledge/KnowledgeView';
import SettingsView from './components/Settings/SettingsView';
import ToastContainer from './components/common/Toast';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('chat');
  const conversationState = useConversations();

  const renderView = () => {
    switch (activeView) {
      case 'chat':
        return <ChatView conversationState={conversationState} />;
      case 'knowledge':
        return <KnowledgeView />;
      case 'settings':
        return <SettingsView />;
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        conversationState={conversationState}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header activeView={activeView} />
        <main className="flex-1 overflow-hidden">
          <div key={activeView} className="h-full animate-fade-in">
            {renderView()}
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
