
"use client";

import React, {useState, useEffect, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useToast} from "@/hooks/use-toast";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    padding: '20px',
    backgroundColor: '#f0f0f0',
  },
  chatArea: {
    flexGrow: 1,
    overflowY: 'auto',
    marginBottom: '20px',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    backgroundColor: 'white',
  },
  inputArea: {
    display: 'flex',
  },
  inputField: {
    flexGrow: 1,
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    marginRight: '10px',
  },
  sendButton: {
    padding: '10px 15px',
    backgroundColor: '#007BFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  messageBubble: {
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '10px',
    maxWidth: '70%',
    wordWrap: 'break-word',
  },
  userMessage: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
    color: 'var(--user-message-text)', /* Use CSS variable for text color */
  },
  aiMessage: {
    backgroundColor: '#A0D2EB',
    alignSelf: 'flex-start',
    color: 'var(--ai-message-text)', /* Use CSS variable for text color */
  },
};

interface Message {
  text: string;
  isUser: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const {toast} = useToast();

  useEffect(() => {
    // Scroll to bottom on message change
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {text: inputValue, isUser: true};
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputValue('');

    try {
      if (!API_KEY) {
        throw new Error('API key is missing. Please set the NEXT_PUBLIC_GEMINI_API_KEY environment variable.');
      }

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + API_KEY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{text: inputValue}]
          }],
          safetySettings: [
            {
              "category": "HARM_CATEGORY_HARASSMENT",
              "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              "category": "HARM_CATEGORY_HATE_SPEECH",
              "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
              "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      if (!response.ok) {
        // Check if the status code is 404
        if (response.status === 404) {
          throw new Error(`Gemini API endpoint not found. Ensure the API endpoint is correct and the model exists.`);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = await response.json();
      const aiText = data.candidates[0]?.content?.parts[0]?.text || "No response from AI";

      const aiMessage: Message = {text: aiText, isUser: false};
      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error: any) {
      console.error('Failed to fetch AI response:', error);
      toast({
        title: "Something went wrong!",
        description: error.message || "Failed to get response from AI. Please check your API key and network connection.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <Card>
        <CardHeader>
          <CardTitle>KidenAI</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={chatAreaRef} style={styles.chatArea}>
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  ...styles.messageBubble,
                  ...(message.isUser ? styles.userMessage : styles.aiMessage),
                }}
              >
                {message.text}
              </div>
            ))}
          </div>
          <div style={styles.inputArea}>
            <Input
              style={styles.inputField}
              type="text"
              placeholder="Type your message..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
            />
            <Button style={styles.sendButton} onClick={sendMessage}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
