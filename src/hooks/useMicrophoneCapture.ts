import { useState, useRef, useCallback, useEffect } from 'react';

const TARGET_SAMPLE_RATE = 16000;

const useMicrophoneCapture = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const onDataAvailableCallbackRef = useRef<((base64PcmData: string) => void) | null>(null);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Browser API navigator.mediaDevices.getUserMedia not available.');
      setHasPermission(false);
      return false;
    }
    try {
      // Request a stream just to check permission, then immediately stop it.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      console.error("Error requesting microphone permission:", err);
      if (err instanceof Error) {
        setError(`Permission denied: ${err.message}`);
      } else {
        setError("Permission denied or microphone not available.");
      }
      setHasPermission(false);
      return false;
    }
  }, []);

  const startRecording = useCallback(async (onDataAvailable: (base64PcmData: string) => void): Promise<void> => {
    setError(null);
    if (isRecording) {
      console.warn("Recording is already in progress.");
      return;
    }

    let currentPermission = hasPermission;
    if (currentPermission === null) {
        currentPermission = await requestMicrophonePermission();
    }

    if (!currentPermission) {
      const permError = "Microphone permission not granted.";
      setError(permError);
      console.error(permError);
      throw new Error(permError);
    }

    onDataAvailableCallbackRef.current = onDataAvailable;

    try {
      audioContextRef.current = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      
      // Check if AudioWorklet is supported
      if (!audioContextRef.current.audioWorklet) {
          throw new Error("AudioWorklet API is not supported in this browser. Cannot start recording.");
      }

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: TARGET_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      
      try {
        await audioContextRef.current.audioWorklet.addModule('/pcm-processor.js');
      } catch (e) {
        console.error("Error adding AudioWorklet module:", e);
        throw new Error(`Failed to load PCM processor: ${e instanceof Error ? e.message : String(e)}`);
      }
      
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm-processor', {
        processorOptions: { targetSampleRate: TARGET_SAMPLE_RATE }
      });

      workletNodeRef.current.port.onmessage = (event) => {
        if (onDataAvailableCallbackRef.current && event.data) {
          onDataAvailableCallbackRef.current(event.data);
        }
      };
      
      workletNodeRef.current.port.onmessageerror = (event) => {
        console.error("Error message from AudioWorklet:", event);
        setError("Error in audio processing worklet.");
      };

      mediaStreamSourceRef.current.connect(workletNodeRef.current);
      // No need to connect workletNodeRef.current to destination if it only sends data back.

      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
       if (err instanceof Error) {
        setError(`Error starting recording: ${err.message}`);
        throw err;
      } else {
        const genericError = "An unknown error occurred while starting recording.";
        setError(genericError);
        throw new Error(genericError);
      }
    }
  }, [hasPermission, isRecording, requestMicrophonePermission]);

  const stopRecording = useCallback(() => {
    if (!isRecording) {
      return;
    }
    console.log("Stopping recording...");

    if (workletNodeRef.current) {
      workletNodeRef.current.port.close();
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.error("Error closing AudioContext:", e));
      audioContextRef.current = null;
    }
    
    onDataAvailableCallbackRef.current = null;
    setIsRecording(false);
    console.log("Recording stopped and resources released.");
  }, [isRecording]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording, stopRecording]);

  return {
    hasPermission,
    isRecording,
    error,
    requestMicrophonePermission,
    startRecording,
    stopRecording,
  };
};

export default useMicrophoneCapture;
