"use client";

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useToast} from "@/hooks/use-toast";
import {cn} from "@/lib/utils";
import { Mic, StopCircle } from 'lucide-react';

import useMicrophoneCapture from '@/hooks/useMicrophoneCapture';
import {
  startLiveSession,
  sendAudioData,
  sendTextData,
  closeLiveSession,
  isSessionActive,
  type LiveSessionCallbacks // Assuming LiveServerMessage is implicitly handled or part of a generic type in service
} from '@/lib/geminiLiveVoiceService';
import type { LiveServerMessage, ErrorEvent, CloseEvent } from '@google/generative-ai';


// Ensure API_KEY is defined. It's used by geminiLiveVoiceService implicitly.
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY; 
if (!API_KEY) {
  console.warn('NEXT_PUBLIC_GEMINI_API_KEY is not set. Voice and text chat may not work.');
  // Optionally, you could show a more user-facing error here or disable features.
}

interface Message {
  text: string;
  isUser: boolean;
  audio?: string; // Optional: store base64 audio for potential replay, though not used for playback here
}

// Global AudioContext for playback to avoid creating many contexts
let audioContext: AudioContext | null = null;

const playAudio = async (base64PcmData: string): Promise<void> => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  }
  if (!audioContext) {
    console.error("AudioContext is not supported by this browser.");
    // Consider a toast notification here
    return;
  }
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  try {
    // 1. Decode Base64 to ArrayBuffer (binary string -> Uint8Array -> ArrayBuffer)
    const binaryString = atob(base64PcmData);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcm16ArrayBuffer = bytes.buffer;

    // 2. Convert 16-bit PCM to Float32
    const pcm16Data = new Int16Array(pcm16ArrayBuffer);
    const float32Data = new Float32Array(pcm16Data.length);
    for (let i = 0; i < pcm16Data.length; i++) {
      float32Data[i] = pcm16Data[i] / 32768.0; // Convert to range -1.0 to 1.0
    }

    // 3. Create AudioBuffer
    const audioBuffer = audioContext.createBuffer(
      1, // numberOfChannels (mono)
      float32Data.length, // length (number of samples)
      16000 // sampleRate
    );
    audioBuffer.copyToChannel(float32Data, 0); // channelNumber 0

    // 4. Play AudioBuffer
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (error) {
    console.error('Error playing audio:', error);
    // Consider a toast notification for playback error
  }
};


export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const {toast} = useToast();

  const { 
    isRecording, 
    hasPermission, 
    error: micError, 
    requestMicrophonePermission, 
    startRecording, 
    stopRecording 
  } = useMicrophoneCapture();
  
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);

  useEffect(() => {
    // Scroll to bottom on message change
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (micError) {
      toast({
        title: "Microphone Error",
        description: micError,
        variant: "destructive",
      });
    }
  }, [micError, toast]);

  // Gemini Live Session Callbacks
  const liveSessionCallbacks = useRef<LiveSessionCallbacks>({
    onOpen: () => {
      console.log('Gemini Live Session Opened');
      toast({ title: "Voice Session Started", description: "You can now speak." });
      setVoiceSessionActive(true);
    },
    onMessage: (message: LiveServerMessage) => {
      // console.log('Gemini Message:', JSON.stringify(message, null, 2));
      if (message.serverContent?.modelTurn?.parts) {
        message.serverContent.modelTurn.parts.forEach(part => {
          if (part.text) {
            setMessages(prev => [...prev, { text: part.text as string, isUser: false }]);
          }
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('audio/')) {
            console.log("Received audio from Gemini, attempting to play...");
            playAudio(part.inlineData.data as string).catch(e => console.error("Play audio promise rejected", e));
          }
        });
      } else if (message.clientError) {
         console.error('Gemini Client Error in message:', message.clientError.message);
         toast({ title: "Gemini Error", description: message.clientError.message, variant: "destructive" });
         setVoiceSessionActive(false); // Consider if session should close on all client errors
         closeLiveSession(); // Attempt to close
      }
    },
    onError: (error: ErrorEvent) => {
      console.error('Gemini Live Session Error:', error.message, error.cause);
      toast({ title: "Voice Session Error", description: error.message || "An unknown error occurred.", variant: "destructive" });
      setVoiceSessionActive(false);
      // stopRecording(); // Stop mic if session errors out
    },
    onClose: (event: CloseEvent) => {
      console.log('Gemini Live Session Closed. Reason:', event.reason, 'Message:', event.message);
      toast({ title: "Voice Session Ended", description: event.reason || "Connection closed." });
      setVoiceSessionActive(false);
      if (isRecording) { // If recording was active when session closed unexpectedly
        stopRecording();
      }
    },
  }).current;


  const handleMicClick = async () => {
    let currentPermission = hasPermission;
    if (currentPermission === null || currentPermission === false) {
        currentPermission = await requestMicrophonePermission();
    }

    if (!currentPermission) {
      toast({ title: "Microphone Permission", description: "Microphone permission is required for voice input.", variant: "destructive"});
      return;
    }

    if (isRecording) {
      stopRecording();
      // The live session remains open for potential text input or further voice segments.
      // If you want to signal end of audio definitively, the service would need a method for it.
      // e.g., sendAudioData(null, { audioStreamEnd: true });
      toast({ title: "Recording Stopped" });
    } else {
      // Not recording, so start
      if (!isSessionActive()) {
        try {
          await startLiveSession(liveSessionCallbacks);
          // onOpen callback will setVoiceSessionActive(true)
        } catch (e: any) {
          console.error("Failed to start live session:", e);
          toast({ title: "Session Start Failed", description: e.message || "Could not connect to Gemini.", variant: "destructive" });
          return;
        }
      }
      // Now that session is confirmed or was already active, start recording
      try {
          await startRecording((base64PcmData) => {
            if (isSessionActive()) { // Double check, as session might close during recording attempts
                sendAudioData(base64PcmData);
            } else {
                console.warn("Attempted to send audio data, but session is not active.");
                // Optionally stop recording here if session died mid-speech
                // stopRecording(); 
            }
          });
        toast({ title: "Recording Started" });
      } catch (e: any) {
        console.error("Failed to start recording:", e);
        toast({ title: "Recording Failed", description: e.message || "Could not start microphone.", variant: "destructive" });
        if(isSessionActive() && !voiceSessionActive){ // If session was opened but recording failed, close session
            closeLiveSession();
        }
      }
    }
  };
  
  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {text: inputValue, isUser: true};
    setMessages(prevMessages => [...prevMessages, userMessage]);
    const currentInput = inputValue;
    setInputValue('');

    if (voiceSessionActive && isSessionActive()) {
      try {
        sendTextData(currentInput);
      } catch (error: any) {
        console.error('Failed to send text data via live session:', error);
        toast({
          title: "Send Error",
          description: error.message || "Failed to send message via live session.",
          variant: "destructive",
        });
        // Optionally, revert to adding message back to input or showing error state
      }
    } else {
      // Fallback or alternative: if no voice session, use the old REST API (or disable text if voice is primary)
      // For this task, the requirement is to remove the direct fetch call if voice is active.
      // If voiceSessionActive is false, it implies text chat should also not use the live service.
      // To keep text chat functional when voice session is not active, you might re-introduce a non-live text send.
      // However, the prompt implies prioritizing live session.
      // This block will effectively do nothing if voiceSessionActive is false, per "Remove the direct fetch call".
       console.warn("Voice session not active. Text message not sent via live service.");
       toast({
         title: "Session Inactive",
         description: "Voice session is not active. Start a voice session to send text.",
         variant: "default",
       });
       // Re-add message to input if not sent
       // setInputValue(currentInput); 
       // setMessages(prev => prev.slice(0, -1)); // Remove optimistic user message
    }
  };

  useEffect(() => {
    // Cleanup session on component unmount
    return () => {
      if (isSessionActive()) {
        closeLiveSession();
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(e => console.error("Error closing AudioContext on unmount:", e));
        audioContext = null;
      }
    };
  }, []); // Empty dependency array means this runs on mount and unmount

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-5 bg-background">
      <Card className="flex-grow flex flex-col">
        <CardHeader>
          <CardTitle>KidenAI</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <div
            ref={chatAreaRef}
            className="flex-grow overflow-y-auto mb-4 p-3 border rounded-lg bg-white dark:bg-gray-800" // Added dark mode bg
            style={{height: '50vh'}} 
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "p-2 rounded-lg mb-2 max-w-[70%] break-words text-sm", // text-sm for denser chat
                  message.isUser 
                    ? "bg-blue-500 text-white self-end ml-auto" // User messages on right
                    : "bg-gray-200 text-gray-900 self-start dark:bg-gray-700 dark:text-gray-100" // AI messages on left
                )}
              >
                {message.text}
              </div>
            ))}
          </div>
          <div className="flex items-center">
            <Input
              className="flex-grow p-2 border rounded-lg mr-2"
              type="text"
              placeholder="Type your message or use the mic..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              disabled={isRecording} // Disable text input while recording
            />
            <Button onClick={handleMicClick} variant="outline" size="icon" className="mr-2" disabled={hasPermission === false && !isRecording}>
              {isRecording ? <StopCircle className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button onClick={sendMessage} disabled={isRecording}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
