const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { exec, spawn } = require("child_process");

const app = express();
const PORT = 4000;

const VIDEOS_PATH = "../resources/videos";

let recordingProcess = null;

app.use(cors());

app.get("/", (_req, _res) => {
  _res.send("Hello, World!");
});

app.get("/videos", (_req, _res) => {
  fs.readdir(VIDEOS_PATH, (err, files) => {
    if (err) {
      _res.status(500).json({ error: "Internal Server Error." });
      return;
    }

    const regex = /\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2}.mp4/;
    let videos = [];

    const formatDateComponent = (component) => {
      return component.toString().padStart(2, '0');
    };

    files.forEach((file) => {
      if (regex.test(file)) {
        let videoPath = `${VIDEOS_PATH}/${file}`;
        let videoServedStaticFile = `/videos/${file}`;

        // Get file creation date
        fs.stat(videoPath, (err, stats) => {
          if (err) {
            _res.status(500).json({ error: "Internal Server Error." });
            return;
          }

          const birthtime = stats.birthtime;
          const formattedDate = `${formatDateComponent(birthtime.getDate())}.${formatDateComponent(birthtime.getMonth() + 1)}.${birthtime.getFullYear()} ${formatDateComponent(birthtime.getHours())}:${formatDateComponent(birthtime.getMinutes())}:${formatDateComponent(birthtime.getSeconds())}`;

          // Push formatted date to videos array
          videos.push({ path: videoServedStaticFile, creationDate: formattedDate });

          // Check if all videos have been processed
          if (videos.length === files.filter(f => regex.test(f)).length) {
            _res.status(200).json(videos);
          }
        });
      }
    });

    if (files.filter(f => regex.test(f)).length === 0) {
      _res.status(200).json({ message: "No videos found." });
    }
  });
});

app.get("/videos/count", (_req, _res) => {
  fs.readdir(VIDEOS_PATH, (err, files) => {
    if (err) {
      _res.status(500).json({ error: "Internal Server Error." });
      return;
    }

    const regex = /\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2}.mp4/;
    const videoCount = files.filter(f => regex.test(f)).length;

    _res.status(200).json({ count: videoCount });
  });
});

app.get("/videos/recording-length", (_req, _res) => {
  // Gather the total length of all the videos.
  fs.readdir(VIDEOS_PATH, (err, files) => {
    if (err) {
      _res.status(500).json({ error: "Internal Server Error." });
      return;
    }

    const regex = /\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2}.mp4/;
    let videoLength = 0;

    files.forEach((file) => {
      if (regex.test(file)) {
        let videoPath = `${VIDEOS_PATH}/${file}`;

        exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${videoPath}`, (error, stdout, stderr) => {
          if (error) {
            _res.status(500).json({ error: "Internal Server Error." });
            console.log(stderr);

            return;
          }

          videoLength += parseFloat(stdout);

          if (videoLength === files.filter(f => regex.test(f)).length) {
            _res.status(200).json({ length: videoLength });
          }
        });
      }
    });

    if (files.filter(f => regex.test(f)).length === 0) {
      _res.status(200).json({ message: "No videos found." });
    }
  });
});

app.get("/videos/:videoName/delete", (_req, _res) => {
  const videoName = _req.params.videoName;
  _res.status(200).json({ message: `Video "${videoName}" deleted.` });
});

app.get("/recording/test", (_req, _res) => {
  exec(`libcamera-vid --width 640 --height 480 -t 5000 -o ${VIDEOS_PATH}/test.mp4 --codec libav --bitrate 6500000 --framerate 50 -v 0`, (error, stdout, stderr) => {
    if (error) {
      _res.status(500).json({ error: "Internal Server Error." });
      console.log(stderr);

      return;
    }

    _res.status(200).json({ message: "Test captured successfully." });
  });
});

app.get("/recording/start", (_req, _res) => {
  if (recordingProcess) {
    _res.status(400).json({ error: "Recording already in progress." });
    return;
  }

  const now = new Date();
  const formatDateComponent = (component) => component.toString().padStart(2, '0');
  const fileName = `${formatDateComponent(now.getDate())}-${formatDateComponent(now.getMonth() + 1)}-${now.getFullYear()}_${formatDateComponent(now.getHours())}-${formatDateComponent(now.getMinutes())}-${formatDateComponent(now.getSeconds())}.mp4`;
  const filePath = `${VIDEOS_PATH}/${fileName}`;

  recordingProcess = spawn("libcamera-vid", ["--width", "640", "--height", "480", "-o", filePath, "--codec", "libav", "--bitrate", "6500000", "--framerate", "50", "-t", "0"]);

  recordingProcess.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  recordingProcess.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  recordingProcess.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
    recordingProcess = null;
  });

  _res.status(200).json({ message: "Recording started.", fileName });
});

app.get("/recording/stop", (_req, _res) => {
  if (!recordingProcess) {
    _res.status(400).json({ error: "No recording in progress." });
    return;
  }

  recordingProcess.kill("SIGINT");
  _res.status(200).json({ message: "Recording stopped." });
});

app.get("/recording/status", (_req, _res) => {
  const isRecording = recordingProcess !== null;
  _res.status(200).json({ recording: isRecording });
});

app.use("/videos", express.static(VIDEOS_PATH));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} !`);
});
