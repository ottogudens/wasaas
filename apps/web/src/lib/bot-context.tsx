"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BotContextType {
  selectedBotId: string | null;
  setSelectedBotId: (id: string | null) => void;
  selectedBot: any | null;
  setSelectedBot: (bot: any | null) => void;
}

const BotContext = createContext<BotContextType>({
  selectedBotId: null,
  setSelectedBotId: () => {},
  selectedBot: null,
  setSelectedBot: () => {},
});

export function BotProvider({ children }: { children: React.ReactNode }) {
  const [selectedBot, setSelectedBot] = useState<any | null>(null);

  // Persist the selected bot in memory or local storage if needed
  // For now, simple state is fine. 

  return (
    <BotContext.Provider value={{ 
      selectedBotId: selectedBot?.id || null, 
      setSelectedBotId: (id) => setSelectedBot(id ? { id } : null), 
      selectedBot, 
      setSelectedBot 
    }}>
      {children}
    </BotContext.Provider>
  );
}

export function useBotContext() {
  return useContext(BotContext);
}
