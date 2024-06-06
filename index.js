const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 4000

const VIDEOS_PATH = '../ressources/recordings';

app.use(cors());

app.get('/', (_req, _res) => {
    _res.send('Hello, World!');
});

app.get('/videos', (_req, _res) => {
    // Read current folder
    fs.readdir(VIDEOS_PATH, (err, res) => {
        if (err) {
            _res.status(500).send('Internal Server Error.');
            return;
        }
        
        _res.send(res);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} !`);
});