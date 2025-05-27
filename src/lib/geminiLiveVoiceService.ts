import { 
  GoogleGenAI, 
  type Session, // Using 'type' for interface-like imports
  Modality, 
  type LiveServerMessage, // Using 'type'
  type ErrorEvent,        // Using 'type'
  type CloseEvent         // Using 'type'
} from '@google/generative-ai';

// Define LiveSessionCallbacks interface
export interface LiveSessionCallbacks {
  onOpen?: () => void;
  onMessage?: (message: LiveServerMessage) => void; 
  onError?: (error: ErrorEvent) => void;
  onClose?: (event: CloseEvent) => void;
}

let ai: GoogleGenAI | undefined;
let currentSession: Session | null = null;

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
// Model name for live interaction. Ensure this is the correct one for your use case.
// Vertex AI might use a different endpoint or model identifier structure.
const MODEL_NAME = 'gemini-1.5-flash-latest'; // Using a common model, adjust if a specific "live" model is required/available

function initializeAiClient(): boolean {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API Key (NEXT_PUBLIC_GEMINI_API_KEY) is not configured in environment variables.');
    // In a real app, you might throw an error or have a more robust global error state.
    return false;
  }
  if (!ai) {
    try {
      ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      console.log('GoogleGenAI client initialized.');
    } catch (error) {
      console.error('Failed to initialize GoogleGenAI client:', error);
      return false;
    }
  }
  return true;
}

// Attempt to initialize when module loads.
// Components using this service should ideally also check initialization status or call an init function.
const clientInitialized = initializeAiClient();

export async function startLiveSession(callbacks: LiveSessionCallbacks): Promise<void> {
  if (!clientInitialized || !ai) {
    console.error('Gemini AI client not initialized. Cannot start session.');
    throw new Error('Gemini AI client not initialized.');
  }
  if (currentSession && currentSession.isOpen) {
    console.warn('Session already active. Please close the existing session before starting a new one.');
    // Or, you could opt to close the existing one:
    // await closeLiveSession(); 
    throw new Error('Session already active.');
  }

  try {
    console.log(`Attempting to connect to model: ${MODEL_NAME}`);
    currentSession = await ai.live.connect({
      model: MODEL_NAME,
      config: {
        // Specify that the client expects both text and audio responses.
        responseModalities: [Modality.TEXT, Modality.AUDIO],
      },
      // Callbacks to handle events from the Gemini API.
      callbacks: {
        onopen: () => {
          console.log('Gemini Live Session Opened');
          callbacks.onOpen?.();
        },
        onmessage: (message: LiveServerMessage) => {
          // console.debug('Received message from Gemini server:', JSON.stringify(message, null, 2));
          callbacks.onMessage?.(message);
        },
        onerror: (error: ErrorEvent) => {
          console.error('Gemini Live Session Error:', error.message, error.cause);
          callbacks.onError?.(error);
          currentSession = null; // Clear session on error
        },
        onclose: (event: CloseEvent) => {
          console.log('Gemini Live Session Closed. Reason:', event.reason, 'Message:', event.message);
          callbacks.onClose?.(event);
          currentSession = null; // Clear session on close
        },
      },
    });
    console.log('Live session established.');
  } catch (error) {
    console.error('Failed to start Gemini live session:', error);
    currentSession = null;
    if (error instanceof Error) {
      throw error; // Re-throw for the caller to handle
    } else {
      throw new Error('An unknown error occurred while starting the live session.');
    }
  }
}

export function sendAudioData(base64PcmAudioData: string): void {
  if (!currentSession || !currentSession.isOpen) {
    console.warn('No active session or session not open to send audio data.');
    return;
  }
  try {
    currentSession.sendRealtimeInput({
      media: { data: base64PcmAudioData, mimeType: 'audio/pcm;rate=16000' },
    });
  } catch (error) {
    console.error('Error sending real-time audio input:', error);
    // Potentially handle specific errors or re-throw
  }
}

export function sendTextData(text: string): void {
  if (!currentSession || !currentSession.isOpen) {
    console.warn('No active session or session not open to send text data.');
    return;
  }
  try {
    currentSession.sendClientContent({ turns: text, turnComplete: true });
  } catch (error) {
    console.error('Error sending client text content:', error);
  }
}

export function closeLiveSession(): void {
  if (currentSession) {
    if (currentSession.isOpen) {
      console.log('Closing live session...');
      currentSession.close();
    } else {
      console.log('Live session already closed or closing.');
    }
    // currentSession is set to null in the onclose callback,
    // but we can also clear it here if preferred, especially if onclose isn't guaranteed.
    // currentSession = null; 
  } else {
    console.log('No current session to close.');
  }
}

export function isSessionActive(): boolean {
  return currentSession !== null && currentSession.isOpen;
}

// Optional: Add a specific initialization function if lazy loading or re-init is needed.
export function ensureAiClientInitialized(): boolean {
    if (!ai) {
        return initializeAiClient();
    }
    return clientInitialized;
}
