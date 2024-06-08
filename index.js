const express = require("express");
const cors = require("cors");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
const PORT = 4000;

const VIDEOS_PATH = "../resources/videos";

app.use(cors());

app.get("/", (_req, _res) => {
  _res.send("Hello, World!");
});

app.get("/videos", (_req, _res) => {
  fs.readdir(VIDEOS_PATH, (err, files) => {
    if (err) {
      _res.status(500).send("Internal Server Error.");
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
            _res.status(500).send("Internal Server Error.");
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
      _res.status(200).send("No videos found.");
    }
  });
});

app.get("/videos/:videoName/delete", (_req, _res) => {
  const videoName = _req.params.videoName;
  _res.status(200).send(`Video "${videoName}" deleted.`);
});

app.use("/videos", express.static(VIDEOS_PATH));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} !`);
});
