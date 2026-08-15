import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useBots(token: string | null) {
  const queryClient = useQueryClient();

  // Fetch all bots
  const botsQuery = useQuery({
    queryKey: ['bots'],
    queryFn: async () => {
      if (!token) return [];
      const data = await api.listBots();
      return data;
    },
    enabled: !!token,
  });

  // Fetch a specific bot's status (we just use the generic getBot which returns the bot data including status)
  const useBotStatus = (botId: string) => useQuery({
    queryKey: ['botStatus', botId],
    queryFn: async () => {
      if (!token) return null;
      const data = await api.getBot(botId);
      return data;
    },
    enabled: !!token && !!botId,
    refetchInterval: 5000, // Poll every 5s to keep status updated
  });

  // Create Bot
  const createBotMutation = useMutation({
    mutationFn: async (name: string) => {
      const data = await api.createBot({ name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
    },
  });

  // Delete Bot
  const deleteBotMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.deleteBot(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
    },
  });

  // Update Bot Config
  const updateBotMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const result = await api.updateBot(id, data);
      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      queryClient.invalidateQueries({ queryKey: ['botStatus', variables.id] });
    },
  });

  return {
    bots: botsQuery.data || [],
    isLoading: botsQuery.isLoading,
    isError: botsQuery.isError,
    useBotStatus,
    createBot: createBotMutation.mutateAsync,
    isCreating: createBotMutation.isPending,
    deleteBot: deleteBotMutation.mutateAsync,
    isDeleting: deleteBotMutation.isPending,
    updateBot: updateBotMutation.mutateAsync,
    isUpdating: updateBotMutation.isPending,
    requestPairingCode: useMutation({
      mutationFn: async ({ id, phoneNumber }: { id: string, phoneNumber: string }) => {
        return api.requestPairingCode(id, phoneNumber);
      },
    }).mutateAsync,
  };
}
