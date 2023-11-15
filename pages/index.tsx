import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-8`}
    >
      <div className="w-full">
        <AudioRecorder />
      </div>
    </main>
  );
}

const AudioRecorder: React.FC = () => {
  const RECORDING_LENGTH = 5000; // 5 seconds
  const [permission, setPermission] = useState<boolean>(false);
  const [recording, setRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecordingComplete, setIsRecordingComplete] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [conversationId, setConversationId] = useState<string>("");
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const handleDataAvailable = (event: BlobEvent, conversationId: string) => {
    if (event.data.size > 0) {
      setAudioBlob(event.data);
      uploadAudio(event.data, conversationId); // Upload audio data immediately when available
    }
  };

  const getMicrophonePermission = async () => {
    if ("MediaRecorder" in window) {
      try {
        setPermission(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        let options = { mimeType: "audio/webm", bitsPerSecond: 32000 }; // Example for 128 kbps

        const recorder = new MediaRecorder(stream, options);
        setMediaRecorder(recorder);
      } catch (err) {
        alert((err as Error).message);
      }
    } else {
      alert("The MediaRecorder API is not supported in your browser.");
    }
  };

  const startRecording = () => {
    if (!mediaRecorder) return;

    // get a conversationId
    let convoId = Math.random().toString(36).substring(2, 15);
    mediaRecorder.ondataavailable = (event) =>
      handleDataAvailable(event, convoId);
    mediaRecorder.start();
    setRecording(true);

    // Set up an interval to stop and restart recording every 10 seconds
    const id = setInterval(() => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop(); // This will trigger the data available event
        mediaRecorder.start(); // Restart recording immediately
      }
    }, RECORDING_LENGTH); // set in top of file

    setIntervalId(id);
  };

  const stopRecording = () => {
    if (!mediaRecorder) return;

    mediaRecorder.stop();
    setRecording(false);

    // Clear the interval
    if (intervalId) {
      clearInterval(intervalId);
    }
    setIntervalId(null);
  };

  const uploadAudio = async (blob: Blob, conversationId: string) => {
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    // @ts-ignore
    formData.append("conversationId", conversationId);

    try {
      const response = await axios
        .post("/api/audio-upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((res) => {
          setConversationId(res.data.conversationId);
          setTranscript(
            (existingTranscript) =>
              existingTranscript + " " + res.data.transcript
          );
        });
    } catch (error) {
      console.error("Upload error", error);
    }
  };

  useEffect(() => {
    function scrollToBottom() {
      const container = document.getElementById("content-container");
      // @ts-ignore
      container.scrollTop = container.scrollHeight;
    }

    scrollToBottom();
  }, [transcript]);

  return (
    <div className="w-full">
      <main className="w-full">
        <div className="align-middle py-12">
          {!permission && <ActivateMic func={getMicrophonePermission} />}
          {permission && !recording && !isRecordingComplete && (
            <StartRecording func={startRecording} />
          )}
          {recording && <FinishRecording func={stopRecording} />}
          {isRecordingComplete && (
            <CreateRecap
              func={() => audioBlob && uploadAudio(audioBlob, conversationId)}
            />
          )}
        </div>
        <div>
          {/* {(recording || isRecordingComplete) && ( */}
          {true && (
            <div
              className="w-full max-h-40 overflow-hidden overflow-y-scroll "
              id="content-container"
            >
              <p>{transcript}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const ActivateMic = ({ func }: { func: any }) => {
  return (
    <div className="relative w-56 h-56 flex flex-col items-center justify-center mx-auto">
      <button
        onClick={func}
        className="rounded-full w-full h-full bg-gray-700 text-white absolute top-0 z-10"
      >
        Activate Mic
      </button>
    </div>
  );
};

const StartRecording = ({ func }: { func: any }) => {
  return (
    <div className="relative w-56 h-56 flex flex-col items-center justify-center mx-auto">
      <button
        onClick={func}
        className="rounded-full w-full h-full bg-red-500 text-white absolute top-0 z-10"
      >
        Start Recording
      </button>
    </div>
  );
};

const FinishRecording = ({ func }: { func: any }) => {
  return (
    <div className="relative w-56 h-56 flex flex-col items-center justify-center mx-auto">
      <button
        onClick={func}
        className="rounded-full w-full h-full bg-red-500 text-white absolute top-0 z-10"
      >
        Finish Recording
      </button>
      <div className="rounded-full w-[65%] h-[65%] bg-red-500 text-white animate-[ping_2s_ease-in-out_infinite] z-0 "></div>
    </div>
  );
};

const CreateRecap = ({ func }: { func: any }) => {
  return (
    <div className="relative w-56 h-56 flex flex-col items-center justify-center mx-auto">
      <button
        onClick={func}
        className="rounded-full w-full h-full bg-green-800 text-white absolute top-0 z-10"
      >
        Create Meeting Recap
      </button>
    </div>
  );
};
