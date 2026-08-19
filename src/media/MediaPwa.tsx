import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadMedia } from './mediaApi';
import './MediaPwa.css';

type UploadState = 'idle' | 'camera' | 'recording' | 'uploading' | 'done' | 'error';
type CameraMode = 'photo' | 'video';

export default function MediaPwa() {
  const [state, setState] = useState<UploadState>('idle');
  const [cameraMode, setCameraMode] = useState<CameraMode>('photo');
  const [statusText, setStatusText] = useState('Take a photo with camera or record a video.');
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'video' | null>(null);
  const [lastId, setLastId] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [error, setError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('media-pwa');
    document.title = 'PBMP Media';
    return () => {
      document.documentElement.classList.remove('media-pwa');
      stopStream();
    };
  }, []);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function openCamera(mode: CameraMode) {
    setError('');
    setCameraMode(mode);
    setState('camera');
    setStatusText(mode === 'photo' ? 'Camera ready — tap Capture.' : 'Camera ready — tap Start recording.');
    setPreview(null);
    setPreviewType(null);
    setLastId('');
    setDownloadUrl('');

    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: mode === 'video',
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setState('error');
      setError('Camera access denied or unavailable. Please use the file picker.');
    }
  }

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopStream();
      setState('uploading');
      setStatusText('Uploading photo...');
      const url = URL.createObjectURL(blob);
      setPreview(url);
      setPreviewType('image');

      try {
        const result = await uploadMedia({ file: blob, mimeType: 'image/jpeg', caption: 'camera-photo' });
        setState('done');
        setStatusText(result.message || 'PBMP received your photo.');
        setLastId(result.id || '');
        if (result.downloadUrl) {
          const base = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api/chat';
          const origin = new URL(base).origin;
          setDownloadUrl(`${origin}${result.downloadUrl}`);
        }
      } catch (err) {
        setState('error');
        setError(err instanceof Error ? err.message : 'Upload failed');
        setStatusText('Upload failed.');
      }
    }, 'image/jpeg', 0.92);
  }, []);

  const startVideoRecord = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      stopStream();
      setState('uploading');
      setStatusText('Uploading video...');
      const url = URL.createObjectURL(blob);
      setPreview(url);
      setPreviewType('video');

      try {
        const result = await uploadMedia({ file: blob, mimeType, caption: 'camera-video' });
        setState('done');
        setStatusText(result.message || 'PBMP received your video.');
        setLastId(result.id || '');
        if (result.downloadUrl) {
          const base = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api/chat';
          const origin = new URL(base).origin;
          setDownloadUrl(`${origin}${result.downloadUrl}`);
        }
      } catch (err) {
        setState('error');
        setError(err instanceof Error ? err.message : 'Upload failed');
        setStatusText('Upload failed.');
      }
    };

    recorder.start();
    setState('recording');
    setStatusText('Recording... Tap Stop & Upload when done.');
  }, []);

  const stopVideoRecord = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError('');
    setLastId('');
    setDownloadUrl('');

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setError('Only image or video files are supported.');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    setPreviewType(isImage ? 'image' : 'video');
    setState('uploading');
    setStatusText(`Uploading ${isImage ? 'image' : 'video'}...`);

    try {
      const result = await uploadMedia({ file, mimeType: file.type, caption: file.name });
      setState('done');
      setStatusText(result.message || 'PBMP received your media.');
      setLastId(result.id || '');
      if (result.downloadUrl) {
        const base = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api/chat';
        const origin = new URL(base).origin;
        setDownloadUrl(`${origin}${result.downloadUrl}`);
      }
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStatusText('Upload failed.');
    }
  }, []);

  const reset = useCallback(() => {
    stopStream();
    recorderRef.current = null;
    setState('idle');
    setStatusText('Take a photo with camera or record a video.');
    setPreview(null);
    setPreviewType(null);
    setLastId('');
    setDownloadUrl('');
    setError('');
  }, []);

  const inCamera = state === 'camera' || state === 'recording';

  return (
    <div className="media-pwa-root">
      <div className="media-pwa-card">
        <p className="media-pwa-kicker">Phase 1 · Media Capture</p>
        <h1 className="media-pwa-title">PBMP Media</h1>

        {/* Live camera view */}
        <video
          ref={videoRef}
          className="media-preview"
          style={{ display: inCamera ? 'block' : 'none' }}
          autoPlay
          playsInline
          muted
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Captured preview */}
        {!inCamera && preview && previewType === 'image' && (
          <img className="media-preview" src={preview} alt="preview" />
        )}
        {!inCamera && preview && previewType === 'video' && (
          <video className="media-preview" src={preview} controls muted />
        )}

        <p className="media-status">{statusText}</p>
        {lastId && <p className="media-meta">Received id: {lastId}</p>}
        {downloadUrl && (
          <a className="media-result-link" href={downloadUrl} target="_blank" rel="noopener noreferrer">
            Download from server
          </a>
        )}
        {error && <p className="media-error">{error}</p>}

        <div className="media-actions">
          {/* Idle state — main buttons */}
          {state === 'idle' && (
            <>
              <button className="primary" type="button" onClick={() => openCamera('photo')}>
                📷 Take Photo
              </button>
              <button className="secondary" type="button" onClick={() => openCamera('video')}>
                🎥 Record Video
              </button>
              <label className="ghost">
                📁 Choose from gallery
                <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} />
              </label>
            </>
          )}

          {/* Camera open — photo mode */}
          {state === 'camera' && cameraMode === 'photo' && (
            <>
              <button className="primary" type="button" onClick={capturePhoto}>
                📸 Capture
              </button>
              <button className="ghost" type="button" onClick={reset}>
                Cancel
              </button>
            </>
          )}

          {/* Camera open — video mode, not yet recording */}
          {state === 'camera' && cameraMode === 'video' && (
            <>
              <button className="secondary" type="button" onClick={startVideoRecord}>
                ⏺ Record Start
              </button>
              <button className="ghost" type="button" onClick={reset}>
                Cancel
              </button>
            </>
          )}

          {/* Recording in progress */}
          {state === 'recording' && (
            <>
              <button className="primary" type="button" onClick={stopVideoRecord}>
                ⏹ Stop &amp; Upload
              </button>
            </>
          )}

          {/* Done or error */}
          {(state === 'done' || state === 'error') && (
            <button className="ghost" type="button" onClick={reset}>
              Start new capture
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
