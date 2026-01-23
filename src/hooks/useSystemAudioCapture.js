import { useState, useRef, useCallback, useEffect } from 'react';

// Groq Whisper API - очень быстрый и бесплатный (с лимитами)
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export function useSystemAudioCapture(apiKey) {
    const [isCapturing, setIsCapturing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, capturing, transcribing

    const streamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const intervalRef = useRef(null);

    // Transcribe audio chunk using Groq Whisper
    const transcribeAudio = useCallback(async (audioBlob) => {
        if (!apiKey) {
            setError('Нужен Groq API ключ для транскрипции системного звука');
            return;
        }

        try {
            setStatus('transcribing');

            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', 'whisper-large-v3');
            formData.append('language', 'ru');
            formData.append('response_format', 'text');

            const response = await fetch(GROQ_WHISPER_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `API Error: ${response.status}`);
            }

            const text = await response.text();
            if (text.trim()) {
                setTranscript(prev => prev + text.trim() + ' ');
            }

            setStatus('capturing');
        } catch (err) {
            console.error('Transcription error:', err);
            setError(err.message);
            setStatus('capturing');
        }
    }, [apiKey]);

    const startCapture = useCallback(async () => {
        try {
            setError(null);
            setStatus('capturing');

            // Request screen/tab capture with audio
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            // Check if audio track exists
            const audioTracks = displayStream.getAudioTracks();
            if (audioTracks.length === 0) {
                displayStream.getTracks().forEach(t => t.stop());
                throw new Error('Аудио не выбрано. При выборе вкладки включите галочку "Поделиться звуком вкладки" внизу');
            }

            streamRef.current = displayStream;

            // Stop video track - we only need audio
            displayStream.getVideoTracks().forEach(track => track.stop());

            // Create audio stream for recording
            const audioStream = new MediaStream(audioTracks);

            // Setup MediaRecorder
            const mediaRecorder = new MediaRecorder(audioStream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (chunksRef.current.length > 0) {
                    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    chunksRef.current = [];

                    // Only transcribe if blob has meaningful size
                    if (audioBlob.size > 1000) {
                        await transcribeAudio(audioBlob);
                    }
                }
            };

            // Start recording - send chunks every 5 seconds
            mediaRecorder.start();

            intervalRef.current = setInterval(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                    mediaRecorderRef.current.start();
                }
            }, 5000);

            setIsCapturing(true);

            // Handle stream end
            audioTracks[0].onended = () => {
                stopCapture();
            };

        } catch (err) {
            console.error('Capture error:', err);
            setError(err.message || 'Не удалось захватить аудио');
            setIsCapturing(false);
            setStatus('idle');
        }
    }, [transcribeAudio]);

    const stopCapture = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        setIsCapturing(false);
        setStatus('idle');
    }, []);

    const toggleCapture = useCallback(() => {
        if (isCapturing) {
            stopCapture();
        } else {
            startCapture();
        }
    }, [isCapturing, startCapture, stopCapture]);

    const clearTranscript = useCallback(() => {
        setTranscript('');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCapture();
        };
    }, [stopCapture]);

    return {
        isCapturing,
        transcript,
        fullTranscript: transcript,
        error,
        status,
        startCapture,
        stopCapture,
        toggleCapture,
        clearTranscript,
        setTranscript
    };
}
