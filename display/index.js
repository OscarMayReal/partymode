var isPlaying = false;
var video = "";
var isInstructionsVisible = true;
class QueueItem {
    constructor(item) {
        this.id = Math.random().toString(36).substring(2, 9);
        this.timestamp = Date.now();
        this.item = item;
    }
}
var pushQueueItem = function(item) {
    queue.push(new QueueItem(item));
    document.dispatchEvent(new CustomEvent('queue/update', { detail: { item } }));
}
var queue = [];
var shootConfetti = function() {
    confetti({
        particleCount: 200,
        spread: 180,
        scalar: 1.5,
    });
};
const socket = io();
var url = new URLSearchParams(window.location.search);
var id = url.get('id');
document.getElementById('room-id').innerHTML = id;
socket.on('display/confetti', () => {
    shootConfetti();
});
socket.emit('display/join', id);
// document.body.addEventListener('click', () => {
//     document.documentElement.requestFullscreen();
// });
document.body.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.exitFullscreen();
    } else if (e.key === 'Enter') {
        document.documentElement.requestFullscreen();
    }
});
socket.on('display/toggle-instructions', () => {
    if (isInstructionsVisible) {
        document.querySelector('.connectioninstructions').style.display = 'none';
        document.querySelector('.playerarea').style.display = 'flex';
    } else {
        document.querySelector('.connectioninstructions').style.display = 'flex';
        document.querySelector('.playerarea').style.display = 'none';
    }
    isInstructionsVisible = !isInstructionsVisible;
});
socket.on('display/queue/add', (item) => {
    console.log(item);
    pushQueueItem(JSON.parse(item));
});
document.addEventListener('queue/update', (event) => {
    onQueueChange();
});
onQueueChange = function() {
    socket.emit('display/queue/send', JSON.stringify({ id: id, queue }));
    document.getElementById('queue-count').innerHTML = queue.length;
    if (queue.length > 0) {
        document.querySelector('.queue').style.display = 'block';
    } else {
        document.querySelector('.queue').style.display = 'none';
        document.querySelector('.playerarea').style.display = 'none';
        document.querySelector('.connectioninstructions').style.display = 'flex';
    }
    drawQueueList();
    if (!isPlaying && queue.length > 0) {
        playNextItem();
    }
}
var qrcode = new QRCode(document.getElementById("controller-qr-code-holder"), {
    text: window.location.href.split('/display')[0] + '/controller?id=' + id,
    width: 150,
    height: 150,
    colorDark : "#666666",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
});

var headerqrcode = new QRCode(document.getElementById("connectqrcode-header"), {
    text: window.location.href.split('/display')[0] + '/controller?id=' + id,
    width: 45,
    height: 45,
    colorDark : "#666666",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
});

var drawQueueList = function() {
    var queueArea = document.getElementById('queue-area');
    queueArea.innerHTML = '';
    queue.forEach((item) => {
        var queueItem = document.createElement('div');
        queueItem.classList.add('queue-item');
        queueItem.innerHTML = `
            <img class="queue-item-image" src="${item.item.thumbnail}" alt="">
            <div>
                <div class="queue-item-text">${item.item.title}</div>
                <div class="queue-item-time">${item.item.uploaderName} - Added at ${new Date(item.timestamp).toTimeString()}</div>
            </div>
        `;
        queueArea.appendChild(queueItem);
    });
}

socket.on("controller/joined", (data) => {
    console.log("Controller joined room: " + data.id);
    socket.emit("display/queue/send", JSON.stringify({ id: id, queue }));
});

socket.on('display/queue/playpause', () => {
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
});

socket.on('display/queue/skip', () => {
    video.remove();
    isPlaying = false;
    if (queue.length > 0) {
        queue.shift();
        onQueueChange();
    }
});

onQueueChange();

var playNextItem = function() {
    isPlaying = true;
    if (queue.length > 0) {
        var item = queue[0];
        var videoId = new URL("https://www.youtube.com" + item.item.url).searchParams.get('v');
        fetch("/api/youtube/getinfo?v=" + videoId)
            .then(response => response.json())
            .then(data => {
                document.querySelector('.player-title').innerHTML = data.basic_info.title;
                document.querySelector('.player-subtitle').innerHTML = data.basic_info.channel.name;
                var streamUrl = "/vproxydl?v=" + videoId + "&roomid=" + url.get('id');
                console.log(streamUrl);
                video = document.createElement('video');
                video.src = streamUrl;
                video.autoplay = true;
                document.getElementById('player').appendChild(video);
                video.addEventListener('loadeddata', () => {
                    video.play();
                });
                video.addEventListener('ended', () => {
                    video.remove();
                    isPlaying = false;
                    if (queue.length > 0) {
                        queue.shift();
                        onQueueChange();
                    }
                });
                // var audio = document.createElement('audio');
                // audio.src = streamUrl;
                // document.body.appendChild(audio);
                // audio.play();
                // audio.addEventListener('ended', () => {
                //     audio.remove();
                //     isPlaying = false;
                //     if (queue.length > 0) {
                //         queue.shift();
                //         onQueueChange();
                //     }
                // });
            })
            .catch(error => {
                console.error(error);
            });
    }
}