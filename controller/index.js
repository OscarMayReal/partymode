const socket = io();
var queue = [];
var url = new URLSearchParams(window.location.search);
var id = url.get('id');
console.log(id);
socket.emit('controller/join', id);
socket.on('controller/joined', (data) => {
    document.getElementById('room-id').innerHTML = data.id;
});

var drawQueueList = function() {
    var queueArea = document.getElementById('queue-area');
    queueArea.innerHTML = '';
    queue.forEach((item) => {
        var queueItem = document.createElement('div');
        queueItem.classList.add('findVideoResultItem');
        queueItem.innerHTML = `
            <div class="findVideoResultItemThumbnail">
                <img src="${item.item.thumbnail}" alt="">
            </div>
            <div class="findVideoResultItemText">
                <div class="findVideoResultItemTextTitle">${item.item.title}</div>
                <div class="findVideoResultItemTextDescription">${item.item.uploaderName}</div>
            </div>
        `;
        queueArea.appendChild(queueItem);
    });
}

document.querySelector('.action-button').addEventListener('touchstart', () => {
    navigator.vibrate(5);
});
document.querySelector('.action-button').addEventListener('touchend', () => {
    navigator.vibrate(10);
});

document.getElementById('confetti-button').addEventListener('mouseup', () => {
    socket.emit('controller/confetti', id);
});
document.getElementById('toggle-instructions-button').addEventListener('mouseup', () => {
    socket.emit('controller/toggle-instructions', id);
});
document.getElementById('queue-button').addEventListener('mouseup', () => {
    document.getElementById('findVideoDialog').style.display = 'block';
});
document.getElementById('play-pause-button').addEventListener('mouseup', () => {
    socket.emit('controller/queue/playpause', id);
});
document.getElementById('skip-button').addEventListener('mouseup', () => {
    socket.emit('controller/queue/skip', id);
});

var addQueueItem = function(item) {
    socket.emit('controller/queue/add', JSON.stringify(item));
}
var closeDialog = function(element) {
    element.style.display = 'none';
}
document.getElementById("findVideoInput").addEventListener('keydown', (ev) => {
    console.log(ev.key);
    if (ev.key === 'Enter') {
        searchYouTube(ev.target.value);
    }
})
var searchYouTube = function(req) {
    fetch('https://api.piped.private.coffee/search?q=' + req + '&filter=all')
    .then(response => response.json())
    .then(data => {
        console.log(data);
        drawFindVideoResults(data);
    })
}

socket.on("controller/queue/receive", (queueres) => {
    console.log(queueres);
    queue = JSON.parse(queueres);
    queue = queue.queue;
    console.log(queue);
    drawQueueList();
})

socket.on("display/queue/add", (item) => {
    console.log(item);
    var parsedItem = JSON.parse(item);
    var queueArea = document.getElementById('queue-area');
    var queueItem = document.createElement('div');
    queueItem.classList.add('findVideoResultItem');
    queueItem.innerHTML = `
        <div class="findVideoResultItemThumbnail">
            <img src="${parsedItem.thumbnail}" alt="">
        </div>
        <div class="findVideoResultItemText">
            <div class="findVideoResultItemTextTitle">${parsedItem.title}</div>
            <div class="findVideoResultItemTextDescription">${parsedItem.uploaderName}</div>
        </div>
    `;
    queueArea.appendChild(queueItem);
})

var drawFindVideoResults = function(results) {
    var findVideoResults = document.getElementById('findVideoResults');
    findVideoResults.innerHTML = '';
    results.items.forEach(result => {
        var findVideoResultItem = document.createElement('div');
        findVideoResultItem.classList.add('findVideoResultItem');
        findVideoResultItem.addEventListener('touchstart', () => {
            navigator.vibrate(5);
        });
        findVideoResultItem.addEventListener('mouseup', () => {
            navigator.vibrate(10);
            result.id = url.get('id');
            addQueueItem(result);
            closeDialog(document.getElementById('findVideoDialog'));
        });
        if (result.type === 'stream') {
            findVideoResultItem.innerHTML = `
                <div class="findVideoResultItemThumbnail">
                    <img src="${result.thumbnail}" alt="">
                </div>
                <div class="findVideoResultItemText">
                    <div class="findVideoResultItemTextTitle">${result.title}</div>
                    <div class="findVideoResultItemTextDescription">${result.uploaderName}</div>
                </div>
            `;
            findVideoResults.appendChild(findVideoResultItem);
        }
    });
}