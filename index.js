import express from "express";
import {Server} from "socket.io";
import { Innertube, Player } from 'youtubei.js';
import axios from "axios";
import fs from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
const innertube = await Innertube.create();

const app = express();

app.use("/controller", express.static("controller"));
app.use("/display", express.static("display"));

app.get("/", (req, res) => {
    res.redirect("/display?id=" + Math.random().toString(36).substring(2, 8) + new Date().toISOString().replaceAll(/:/g, "").replaceAll(/-/g, ""));
});

const httpServer = app.listen(3001, () => {
    console.log("Server started on port 3001");
});

const io = new Server(httpServer);

io.on("connection", (socket) => {
    var roomid = null;
    console.log("Client connected");
    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
    socket.on("controller/join", (id) => {
        console.log("Controller joined room: " + id);
        socket.join("partymode_room_" + id);
        socket.nsp.to("partymode_room_" + id).emit("controller/joined", { id });
    });
    socket.on("controller/confetti", (id) => {
        console.log("Controller confetti: " + id);
        socket.to("partymode_room_" + id).emit("display/confetti");
    });
    socket.on("controller/toggle-instructions", (id) => {
        console.log("Controller toggle instructions: " + id);
        socket.to("partymode_room_" + id).emit("display/toggle-instructions");
    });
    socket.on("display/join", (id) => {
        console.log("Display joined room: " + id);
        socket.join("partymode_room_" + id);    
        socket.to("partymode_room_" + id).emit("display/joined", { id });
        roomid = id;
        fs.mkdirSync("videos/" + roomid, { recursive: true });
    });
    socket.on("controller/queue/add", (item) => {
        var parsedItem = JSON.parse(item);
        console.log("Controller queue add: " + parsedItem);
        console.log(parsedItem.id)
        socket.nsp.to("partymode_room_" + parsedItem.id).emit("display/queue/add", item);
    });
    socket.on("controller/queue/skip", (id) => {
        console.log("Controller queue skip: " + id);
        socket.nsp.to("partymode_room_" + id).emit("display/queue/skip");
    });
    socket.on("display/queue/send", (queue) => {
        var parsedQueue = JSON.parse(queue);
        console.log("Display queue send: " + parsedQueue.id);
        socket.nsp.to("partymode_room_" + parsedQueue.id).emit("controller/queue/receive", queue);
    });
    socket.on("controller/queue/playpause", (id) => {
        console.log("Controller queue playpause: " + id);
        socket.nsp.to("partymode_room_" + id).emit("display/queue/playpause");
    });
    socket.on("disconnect", () => {
        console.log("Client disconnected");
        if (roomid != null) {
            socket.nsp.to("partymode_room_" + roomid).emit("display/disconnected");
            fs.rmSync("videos/" + roomid, { recursive: true });
        }
    })
});

app.get("/api/youtube/search", (req, res) => {
    var query = req.query.q;
    innertube.search(query).then((data) => {
        res.json(data);
    });
});

app.get("/api/youtube/getinfo", async (req, res) => {
    var videoId = req.query.v;
    var data = await innertube.getInfo(videoId);
    res.json(data);
});

app.get("/api/youtube/player", async (req, res) => {
    var videoId = req.query.v;
    var data = await innertube.getInfo(videoId);
    var player = data.streaming_data.formats[0].decipher(innertube.session.player)
    res.send(player);
})
    
app.get('/vproxy/:url', (req, res) => {
    const url = decodeURIComponent(req.params.url)
  
    var retries = 0;

    while (retries < 3 && !worked) {
        var worked = false
        axios.get(url, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                "referer": "https://www.youtube.com/",
                "origin": "https://www.youtube.com",
            }
        })
            .then((stream) => {
                worked = true;
                res.writeHead(stream.status, stream.headers)
                stream.data.pipe(res)
            })
            .catch(err => {
                console.error(err)
                worked = false;
            })
        retries++;
    }
});

app.get('/vproxydl/', async (req, res) => {
    const videoId = req.query.v;
    var roomid = req.query.roomid;
    var vidstream = await innertube.getStreamingData(videoId, {
        client: "ANDROID"
    });
    var video = await fetch(vidstream.decipher(innertube.session.player))
    fs.mkdirSync("videos/" + roomid, { recursive: true });
    var filestream = fs.createWriteStream("videos/" + roomid + "/" + videoId + ".mp4");
    await finished(Readable.fromWeb(video.body).pipe(filestream));
    res.sendFile("videos/" + roomid + "/" + videoId + ".mp4", { root: "./" });
});

app.get('/api/youtube/download', async (req, res) => {
    var videoId = req.query.v;
    var data = await innertube.getInfo(videoId);
    var downloadURL = await innertube.download(videoId, {
        client: "WEB"
    });
    res.json(downloadURL);
});
