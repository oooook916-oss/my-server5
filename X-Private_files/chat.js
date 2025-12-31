(function () {
  'use strict';

  // Your Render Server URL
  const CHAT_WS = 'wss://my-server5.onrender.com/chat';

  const css = `
    .ogx-chat {
      position: fixed; left: 20px; bottom: 20px; width: 350px; height: 250px;
      background: rgba(0, 0, 0, 0.85); border: 1px solid #444; border-radius: 8px;
      color: #fff; font-family: sans-serif;
      display: flex; flex-direction: column; z-index: 1000000;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5); overflow: hidden;
    }
    .ogx-chat-header {
      background: #222; padding: 8px 12px; font-size: 12px; font-weight: bold;
      border-bottom: 1px solid #333; text-transform: uppercase;
    }
    .ogx-chat-messages {
      flex: 1; overflow-y: auto; padding: 10px; font-size: 13px;
    }
    .ogx-chat-input-area {
      display: flex; padding: 10px; background: #111; border-top: 1px solid #333;
    }
    .ogx-chat-input-area input {
      flex: 1; background: #252525; border: 1px solid #444; color: #fff;
      padding: 8px 12px; border-radius: 20px; outline: none;
    }
    .ogx-chat-msg { margin-bottom: 4px; }
    .ogx-chat-msg b { color: #00d4ff; }
    .ogx-chat-sys { color: #ffcc00; font-style: italic; }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const chatContainer = document.createElement('div');
  chatContainer.className = 'ogx-chat';
  chatContainer.innerHTML = `
    <div class="ogx-chat-header">Server Chat</div>
    <div class="ogx-chat-messages" id="chatLog"></div>
    <div class="ogx-chat-input-area">
      <input type="text" id="chatInput" placeholder="Type message..." autocomplete="off">
    </div>
  `;
  document.body.appendChild(chatContainer);

  const logEl = document.getElementById('chatLog');
  const inputEl = document.getElementById('chatInput');
  let ws;

  function addLog(name, text, isSys = false) {
    const msg = document.createElement('div');
    msg.className = 'ogx-chat-msg';
    if (isSys) {
      msg.innerHTML = `<span class="ogx-chat-sys">${text}</span>`;
    } else {
      msg.innerHTML = `<b>${name}:</b> <span>${text}</span>`;
    }
    logEl.appendChild(msg);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function startConnection() {
    ws = new WebSocket(CHAT_WS);

    ws.onopen = () => {
      logEl.innerHTML = ''; // Clear logs on new connection
      addLog(null, 'Connected to Server', true);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'msg') {
          addLog(data.from || 'Guest', data.text);
        }
      } catch (err) {
        addLog('Server', e.data);
      }
    };

    ws.onclose = () => {
      addLog(null, 'Connection Lost. Reconnecting...', true);
      setTimeout(startConnection, 3000);
    };

    ws.onerror = () => {
      console.error('WebSocket Error');
    };
  }

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && inputEl.value.trim()) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const nick = document.getElementById('nickname')?.value || 'Anon';
        ws.send(JSON.stringify({
          type: 'say',
          text: inputEl.value.trim(),
          from: nick
        }));
        inputEl.value = '';
      }
    }
    e.stopPropagation();
  });

  startConnection();
})();
