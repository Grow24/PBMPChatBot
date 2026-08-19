import { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
    onAudioRecorded: (transcribedText: string) => void;
    disabled?: boolean;
}

// Type declaration for Web Speech API
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

const AudioRecorder = ({ onAudioRecorded, disabled }: AudioRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [transcribedText, setTranscribedText] = useState('');
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false); // Track recording state without causing re-renders

    useEffect(() => {
        // Check if browser supports Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

      // Only show the latest result, don't accumulate
      if (finalTranscript) {
        setTranscribedText(finalTranscript.trim());
      } else {
        setTranscribedText(interimTranscript);
      }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);

            if (event.error === 'no-speech') {
                // User stopped speaking, continue - don't stop recording
                return;
            } else if (event.error === 'not-allowed') {
                // Microphone permission denied
                isRecordingRef.current = false;
                setIsRecording(false);
                setRecordingTime(0);
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                alert('Microphone access denied. Please:\n\n1. Click the lock/camera icon in your browser\'s address bar\n2. Allow microphone access\n3. Refresh the page and try again');
            } else if (event.error === 'aborted') {
                // Recording was aborted (user stopped it)
                isRecordingRef.current = false;
                setIsRecording(false);
                setRecordingTime(0);
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            } else {
                // Other errors - stop recording
                isRecordingRef.current = false;
                setIsRecording(false);
                setRecordingTime(0);
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                console.warn('Speech recognition error:', event.error);
            }
        };

        recognition.onend = () => {
            // Only restart if we're still supposed to be recording
            if (isRecordingRef.current) {
                try {
                    recognition.start();
                } catch (e) {
                    // Already started or error - ignore
                }
            }
        };

        recognitionRef.current = recognition;

        return () => {
            // Cleanup on unmount
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Already stopped
                }
            }
        };
    }, []); // Only run once on mount

    const startRecording = async () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Speech Recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        if (!recognitionRef.current) {
            alert('Speech Recognition not initialized. Please refresh the page.');
            return;
        }

        // Check for available audio devices first
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');

            if (audioInputs.length === 0) {
                alert('No microphone found. Please:\n\n1. Connect a microphone to your computer\n2. Check your system settings to ensure microphone is enabled\n3. Make sure no other app is using the microphone\n4. Try refreshing the page');
                return;
            }

            console.log('Available audio inputs:', audioInputs.length);
        } catch (deviceError) {
            console.warn('Could not enumerate devices:', deviceError);
            // Continue anyway - might work without enumeration
        }

        // Request microphone permission first
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (permissionError: any) {
            console.error('Microphone permission error:', permissionError);
            if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
                alert('Microphone access denied. Please:\n\n1. Click the lock/camera icon in your browser\'s address bar\n2. Allow microphone access\n3. Try recording again');
                return;
            } else if (permissionError.name === 'NotFoundError') {
                alert('No microphone found. Please:\n\n1. Connect a microphone to your computer\n2. Check your system settings:\n   - macOS: System Settings → Privacy & Security → Microphone\n   - Windows: Settings → Privacy → Microphone\n   - Linux: Check audio settings\n3. Make sure no other app is using the microphone\n4. Try refreshing the page');
                return;
            } else if (permissionError.name === 'NotReadableError') {
                alert('Microphone is being used by another application. Please:\n\n1. Close other apps using the microphone\n2. Check system settings\n3. Try again');
                return;
            } else {
                alert(`Failed to access microphone: ${permissionError.message}\n\nPlease check your browser and system settings.`);
                return;
            }
        }

        // Clear any existing timer first
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        try {
            // Reset state
            setRecordingTime(0);
            setTranscribedText('');
            isRecordingRef.current = true;
            setIsRecording(true);

            // Start recognition
            recognitionRef.current.start();

            // Start timer - use a fresh interval
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => {
                    return prev + 1;
                });
            }, 1000);
        } catch (error: any) {
            console.error('Error starting speech recognition:', error);
            isRecordingRef.current = false;
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            if (error.name === 'NotAllowedError') {
                alert('Microphone access denied. Please allow microphone access in your browser settings.');
            } else {
                alert('Failed to start recording. Please try again.');
            }
        }
    };

    const stopRecording = () => {
        // Stop recognition
        isRecordingRef.current = false;
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Already stopped
            }
        }

        // Stop timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        setIsRecording(false);

        // Send transcribed text
        if (transcribedText.trim()) {
            onAudioRecorded(transcribedText.trim());
            setTranscribedText('');
        } else {
            alert('No speech detected. Please try again.');
        }

        setRecordingTime(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <>
            <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={disabled}
                style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isRecording ? '#ef4444' : '#6b7280',
                    transition: 'all 0.2s ease',
                    opacity: disabled ? 0.5 : 1,
                    zIndex: 10,
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px'
                }}
                title={isRecording ? 'Stop recording' : 'Start recording'}
                onMouseDown={(e) => e.preventDefault()}
            >
                {isRecording ? (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                        <div
                            style={{
                                position: 'absolute',
                                top: '-2px',
                                right: '-2px',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#ef4444',
                                animation: 'pulse 1.5s infinite'
                            }}
                        />
                    </div>
                ) : (
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                )}
            </button>
            {isRecording && (
                <div style={{
                    position: 'fixed',
                    bottom: '100px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '12px 20px',
                    background: 'rgba(239, 68, 68, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 1000,
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600'
                }}>
                    <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'white',
                        animation: 'pulse 1.5s infinite'
                    }} />
                    <span>Recording: {formatTime(recordingTime)}</span>
                    {transcribedText && (
                        <span style={{ marginLeft: '12px', fontStyle: 'italic', opacity: 0.9 }}>
                            "{transcribedText}"
                        </span>
                    )}
                </div>
            )}
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
      `}</style>
        </>
    );
};

export default AudioRecorder;
