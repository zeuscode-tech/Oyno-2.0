import { WSMessage, WSChatMessage } from '@/types';
import { WS_BASE_URL } from '@/services/network';
import { appStorage } from '@/services/storage';

const WS_BASE = WS_BASE_URL;
const TOKEN_KEY = 'oyno_tokens';

type MessageHandler = (msg: WSChatMessage) => void;
type TypingHandler = (data: { user_name: string; is_typing: boolean }) => void;

class OynoSocket {
  private sockets: Map<number, WebSocket> = new Map();
  private handlers: Map<number, { message: MessageHandler[]; typing: TypingHandler[] }> = new Map();

  private async getToken(): Promise<string | null> {
    try {
      const raw = await appStorage.getItem(TOKEN_KEY);
      if (!raw) return null;
      return JSON.parse(raw).access;
    } catch {
      return null;
    }
  }

  async joinRoom(roomId: number): Promise<void> {
    if (this.sockets.has(roomId)) return;

    const token = await this.getToken();
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}/chat/${roomId}/?token=${token}`);

    ws.onopen = () => {
      console.log(`[WS] Connected to room ${roomId}`);
    };

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        const roomHandlers = this.handlers.get(roomId);
        if (!roomHandlers) return;

        if (data.type === 'chat.message') {
          roomHandlers.message.forEach((h) => h(data.payload as WSChatMessage));
        }
        if (data.type === 'chat.typing') {
          roomHandlers.typing.forEach((h) =>
            h(data.payload as { user_name: string; is_typing: boolean })
          );
        }
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    ws.onerror = (e) => console.error(`[WS] Error in room ${roomId}:`, e);

    ws.onclose = () => {
      console.log(`[WS] Disconnected from room ${roomId}`);
      this.sockets.delete(roomId);
      // Auto-reconnect after 3s
      setTimeout(() => this.joinRoom(roomId), 3000);
    };

    this.sockets.set(roomId, ws);
    if (!this.handlers.has(roomId)) {
      this.handlers.set(roomId, { message: [], typing: [] });
    }
  }

  leaveRoom(roomId: number): void {
    const ws = this.sockets.get(roomId);
    if (ws) {
      ws.close();
      this.sockets.delete(roomId);
    }
    this.handlers.delete(roomId);
  }

  sendMessage(roomId: number, text: string): void {
    const ws = this.sockets.get(roomId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'chat.message', text }));
    }
  }

  sendTyping(roomId: number, isTyping: boolean): void {
    const ws = this.sockets.get(roomId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'chat.typing', is_typing: isTyping }));
    }
  }

  onMessage(roomId: number, handler: MessageHandler): () => void {
    const h = this.handlers.get(roomId);
    if (h) h.message.push(handler);
    return () => {
      const hh = this.handlers.get(roomId);
      if (hh) hh.message = hh.message.filter((fn) => fn !== handler);
    };
  }

  onTyping(roomId: number, handler: TypingHandler): () => void {
    const h = this.handlers.get(roomId);
    if (h) h.typing.push(handler);
    return () => {
      const hh = this.handlers.get(roomId);
      if (hh) hh.typing = hh.typing.filter((fn) => fn !== handler);
    };
  }

  disconnectAll(): void {
    this.sockets.forEach((ws) => ws.close());
    this.sockets.clear();
    this.handlers.clear();
  }
}

export const oynoSocket = new OynoSocket();
