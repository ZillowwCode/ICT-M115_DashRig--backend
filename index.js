const express = require("express");
const cors = require("cors");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
const PORT = 4000;

const VIDEOS_PATH = "../resources/raw/videos";
const THUMBNAIL_PATH = "../resources/client/thumbnails";

app.use(cors());

app.get("/", (_req, _res) => {
  _res.send("Hello, World!");
});

app.get("/videos", (_req, _res) => {
  fs.readdir(VIDEOS_PATH, (err, res) => {
    if (err) {
      _res.status(500).send("Internal Server Error.");
      return;
    }

    let videosNames = [];

    res.forEach((file) => {
      const regex = /\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2}.mp4/;
      if (regex.test(file)) {
        videosNames.push(file);
      }
    });

    if (videosNames.length === 0) {
      _res.status(200).send("No videos found.");
    } else {
      videosNames.forEach((videoName) => {
        const videoPath = `${VIDEOS_PATH}/${videoName}`;

        ffmpeg(videoPath).screenshot({
          timestamps: ["00:00:05"],
          filename: `${videoName}.png`,
          folder: THUMBNAIL_PATH,
          size: "300x200",
        });
      });

      _res.status(200).send(videosNames);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} !`);
});
