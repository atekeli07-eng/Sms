const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- BELLEKTEKİ VERİLER ---
const users = new Map(); // Kullanıcı durumlarını tutar

// --- ARAYÜZ (HTML & CSS & JS) ---
const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Anlık Mesajlaşma Sistemi</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; display: flex; height: 100vh; background: #e5ddd5; }
        #sidebar { width: 280px; background: #fff; border-right: 1px solid #ddd; display: flex; flex-direction: column; }
        .sidebar-header { padding: 15px; background: #eee; font-weight: bold; border-bottom: 1px solid #ddd; }
        #userList { flex: 1; overflow-y: auto; }
        .user-item { display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #f9f9f9; }
        .status-light { width: 10px; height: 10px; border-radius: 50%; margin-right: 12px; }
        .online { background: #2ecc71; box-shadow: 0 0 5px #2ecc71; }
        .offline { background: #e74c3c; }
        
        #chat { flex: 1; display: flex; flex-direction: column; }
        #messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
        .bubble { padding: 8px 12px; border-radius: 8px; background: #fff; max-width: 70%; box-shadow: 0 1px 1px rgba(0,0,0,0.1); position: relative; }
        .bubble b { font-size: 0.8em; color: #075e54; display: block; }
        .bubble img, .bubble video { max-width: 100%; border-radius: 5px; margin-top: 5px; }
        .system-msg { align-self: center; background: #d1ebe8; font-size: 0.8em; padding: 4px 10px; }

        #input-area { padding: 10px; background: #f0f0f0; display: flex; gap: 10px; align-items: center; }
        input[type="text"] { flex: 1; padding: 10px; border: none; border-radius: 20px; outline: none; }
        button { background: #075e54; color: white; border: none; padding: 10px 15px; border-radius: 50%; cursor: pointer; }
        .media-btn { background: #3498db; border-radius: 5px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div id="sidebar">
        <div class="sidebar-header">Kullanıcılar</div>
        <div id="userList"></div>
    </div>
    <div id="chat">
        <div id="messages"></div>
        <div id="input-area">
            <button class="media-btn" onclick="sendMedia('image')">📷</button>
            <button class="media-btn" onclick="sendMedia('video')">🎥</button>
            <input type="text" id="msgInput" placeholder="Mesaj yazın..." onkeypress="if(event.key==='Enter') send()">
            <button onclick="send()">➤</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let name = prompt("Kullanıcı Adınız?") || "Anonim";
        socket.emit('join', name);

        socket.on('userUpdate', (users) => {
            const list = document.getElementById('userList');
            list.innerHTML = '';
            for (let user in users) {
                const statusClass = users[user].status === 'online' ? 'online' : 'offline';
                list.innerHTML += \`
                    <div class="user-item">
                        <div class="status-light \${statusClass}"></div>
                        <span>\${user} <br><small style="color:gray">\${users[user].status}</small></span>
                    </div>\`;
            }
        });

        socket.on('msg', (data) => {
            const div = document.createElement('div');
            div.className = data.type === 'system' ? 'bubble system-msg' : 'bubble';
            
            let content = \`<b>\${data.user}</b>\`;
            if(data.type === 'text') content += \`<span>\${data.val}</span>\`;
            else if(data.type === 'image') content += \`<img src="\${data.val}">\`;
            else if(data.type === 'video') content += \`<video src="\${data.val}" controls></video>\`;
            
            div.innerHTML = content;
            document.getElementById('messages').appendChild(div);
            document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
        });

        function send() {
            const input = document.getElementById('msgInput');
            if(input.value) {
                socket.emit('send', { val: input.value, type: 'text' });
                input.value = '';
            }
        }

        function sendMedia(type) {
            const url = type === 'image' 
                ? 'https://picsum.photos/300/200?random=' + Math.random() 
                : 'https://www.w3schools.com/html/mov_bbb.mp4';
            socket.emit('send', { val: url, type: type });
        }
    </script>
</body>
</html>
`;

// --- BACKEND LOGIC ---
app.get('/', (req, res) => res.send(htmlContent));

io.on('connection', (socket) => {
    socket.on('join', (username) => {
        socket.username = username;
        users.set(username, { status: 'online' });
        io.emit('userUpdate', Object.fromEntries(users));
        io.emit('msg', { user: 'Sistem', val: `${username} bağlandı`, type: 'system' });
    });

    socket.on('send', (data) => {
        io.emit('msg', { user: socket.username, val: data.val, type: data.type });
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            users.set(socket.username, { status: 'offline' });
            io.emit('userUpdate', Object.fromEntries(users));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu hazır: http://localhost:${PORT}`));
