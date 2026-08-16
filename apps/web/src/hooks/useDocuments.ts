import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useDocuments(token: string | null) {
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      if (!token) return [];
      const res = await api.listDocuments();
      return res.documents;
    },
    enabled: !!token,
  });

  const processDocumentMutation = useMutation({
    mutationFn: async (body: { title: string; content: string; botId?: string }) => {
      const data = await api.processDocument(body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const processUrlMutation = useMutation({
    mutationFn: async (body: { url: string; title?: string; botId?: string }) => {
      const data = await api.processUrlDocument(body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const resyncUrlMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const data = await api.resyncUrlDocument(documentId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.deleteDocument(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    isError: documentsQuery.isError,
    refetchDocuments: documentsQuery.refetch,
    processDocument: processDocumentMutation.mutateAsync,
    isProcessing: processDocumentMutation.isPending,
    processUrl: processUrlMutation.mutateAsync,
    isProcessingUrl: processUrlMutation.isPending,
    resyncUrl: resyncUrlMutation.mutateAsync,
    isResyncing: resyncUrlMutation.isPending,
    deleteDocument: deleteDocumentMutation.mutateAsync,
    isDeleting: deleteDocumentMutation.isPending,
  };
}
