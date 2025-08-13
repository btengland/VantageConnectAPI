// This is a basic WebSocket service to connect to the AWS API Gateway WebSocket API

// Replace with your actual API Gateway WebSocket URL
const WEBSOCKET_URL = 'wss://gh1j093d4d.execute-api.us-east-2.amazonaws.com/prod';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.onMessageCallback = null;
  }

  connect(sessionId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected.');
      return;
    }

    const url = `${WEBSOCKET_URL}?sessionId=${sessionId}`;
    console.log('Connecting to WebSocket:', url);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);
      if (this.onMessageCallback) {
        this.onMessageCallback(message);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.ws = null;
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  sendMessage(action, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        action,
        payload,
      };
      console.log('Sending message:', message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected.');
    }
  }

  setOnMessageCallback(callback) {
    this.onMessageCallback = callback;
  }
}

// Export a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;
