import { useEffect, useRef, useCallback } from 'react';
import { oynoSocket } from '@/services/socket';
import { WSChatMessage } from '@/types';

export function useChatSocket(
  roomId: number,
  onMessage: (msg: WSChatMessage) => void
) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!roomId) return;
    oynoSocket.joinRoom(roomId);
    const unsub = oynoSocket.onMessage(roomId, (msg) => {
      onMessageRef.current(msg);
    });
    return () => {
      unsub();
      oynoSocket.leaveRoom(roomId);
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (text: string) => oynoSocket.sendMessage(roomId, text),
    [roomId]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => oynoSocket.sendTyping(roomId, isTyping),
    [roomId]
  );

  return { sendMessage, sendTyping };
}
