import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useConversations(botId: string | null) {
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ['conversations', botId],
    queryFn: async () => {
      if (!botId) return [];
      const data = await api.listConversations(botId);
      return data;
    },
    enabled: !!botId,
    refetchInterval: 5000,
  });

  const useMessages = (conversationId: string | null) => useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const data = await api.getMessages(conversationId);
      return data;
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string, content: string }) => {
      const data = await api.sendManualMessage(conversationId, content);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', botId] });
    },
  });

  const toggleHumanModeMutation = useMutation({
    mutationFn: async ({ conversationId, isHumanMode }: { conversationId: string, isHumanMode: boolean }) => {
      const data = await api.toggleHumanMode(conversationId, isHumanMode);
      return data;
    },
    // Optimistic Update can be handled via onSuccess invalidation for simplicity
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', botId] });
    },
  });

  return {
    conversations: conversationsQuery.data || [],
    isLoading: conversationsQuery.isLoading,
    isError: conversationsQuery.isError,
    useMessages,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    toggleHumanMode: toggleHumanModeMutation.mutateAsync,
    isTogglingMode: toggleHumanModeMutation.isPending,
  };
}
