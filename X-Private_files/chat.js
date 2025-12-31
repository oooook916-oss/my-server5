// assets/js/chat.js
(function () {
  'use strict';
  window.__ogxLastSentSkinByPID = window.__ogxLastSentSkinByPID || {};

  const DEFAULT_WS = (() => {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/chat`;
  })();
  const CHAT_WS = 'wss://xprivate.onrender.com/chat';

  function qs(sel, root=document){return root.querySelector(sel);}
  function getText(el){return (el&&'value'in el)?String(el.value):'';}
  function normTag(s){return String(s||'').trim().toUpperCase();}
  function nowHHMM(){const d=new Date();return d.toTimeString().slice(0,5);}

  function nicknameEl(){
    return qs('#nickname')||qs('input[name="nick"]')||
           qs('input[name="nickname"]')||qs('input[placeholder*="name" i]');
  }
  function detectGameNick(){const el=nicknameEl();const v=el?getText(el).trim():'';return v||'Anon';}
  function tagEl(){return qs('#tag')||qs('input[placeholder*="tag" i]');}
  function currentTag(){return normTag(getText(tagEl()));}
  function skinInputEl(idx){
    if(idx===1) return qs('#customSkin1') || qs('input[name="customSkin1"]');
    if(idx===2) return qs('#customSkin2') || qs('input[name="customSkin2"]');
    return null;
  }

  function detectSkinForClientType(clientType){
    const idx = clientType === 'child' ? 2 : 1;
    const input = skinInputEl(idx);
    let v = input ? getText(input).trim() : '';

    if(!v){
      try{
        const key = idx === 1 ? 'ogarx:skin1' : 'ogarx:skin2';
        v = localStorage.getItem(key) || '';
      }catch{}
    }
    return String(v || '').trim();
  }
  function detectCategory(){
    const sel=qs('#servers'); if(!sel) return'ffa';
    const opt=sel.options[sel.selectedIndex];
    const label=(opt?.textContent||'').toLowerCase(), val=(opt?.value||'').toLowerCase();
    if(label.includes('macro')||val.includes(':6001')||val.includes('macro')) return'macro';
    return'ffa';
  }
  function composeRoom(cat,mode,tag){
    if(mode==='party'){const T=normTag(tag);return T?`${cat}:party:${T}`:null;}
    return`${cat}:global`;
  }
  function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}
function getSavedKey() {
  try {
    const v = localStorage.getItem('ogx_key');
    if (v) return v;
  } catch {}
  return getCookie('ogx_key') || '';
}


  const css=`.ogx-chat{position:fixed;left:12px;bottom:30px;width:360px;height:240px;display:flex;flex-direction:column;
  background:rgba(10,10,10,.40);border:1px solid rgba(255,255,255,.1);
  border-radius:12px;color:#fff;font:12px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;z-index:2147483647}
  .ogx-chat-header{display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.08)}
  .ogx-chat-badge{font-weight:600;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.08)}
  .ogx-chat-toggle{margin-left:auto;display:flex;gap:6px}
  .ogx-chat-toggle button{padding:4px 8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);
  color:#fff;border-radius:999px;cursor:pointer}
  .ogx-chat-toggle button.active{background:rgba(255,255,255,.25)}
  .ogx-chat-body{flex:1;overflow:auto;padding:8px}
  .ogx-chat-msg{margin:4px 0}.ogx-chat-time{opacity:.6;margin-right:6px}.ogx-chat-name{font-weight:600;margin-right:6px}
  .ogx-chat-foot{display:flex;gap:6px;padding:8px;border-top:1px solid rgba(255,255,255,.08)}
  .ogx-chat-foot input{flex:1;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.18);
  background:rgba(0,0,0,.25);color:#fff}
  .ogx-chat-foot button{padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.08);color:#fff;cursor:pointer}`;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  const root=document.createElement('div');
  root.className='ogx-chat';
  root.innerHTML=`
  <div class="ogx-chat-header">
    <span class="ogx-chat-badge" id="ogxRoomLabel">…</span>
    <div class="ogx-chat-toggle">
      <button id="ogxBtnGlobal" class="active">Global</button>
      <button id="ogxBtnParty">Party</button>
    </div>
  </div>
  <div class="ogx-chat-body" id="ogxLog"></div>
  <div class="ogx-chat-foot">
    <input id="ogxInput" type="text" maxlength="300" placeholder="Type message… (Enter to send)">
    <button id="ogxSend">Send</button>
  </div>`;
  document.body.appendChild(root);

    // --- CHAT VISIBILITY HOOKED TO SETTINGS ---
  function applyChatVisibility() {
    const cb = document.getElementById('showChat');
    // default: visible if checkbox doesn't exist
    const visible = !cb || cb.checked;
    root.style.display = visible ? '' : 'none';
  }

  // run once on load
  applyChatVisibility();

  // listen for checkbox changes (if settings panel is present)
  const chatCb = document.getElementById('showChat');
  if (chatCb) {
    chatCb.addEventListener('change', applyChatVisibility);
  }
  const qsIn=(s)=>root.querySelector(s);
  const logEl=qsIn('#ogxLog'),inputEl=qsIn('#ogxInput'),
        sendBtn=qsIn('#ogxSend'),labelEl=qsIn('#ogxRoomLabel'),
        btnGlobal=qsIn('#ogxBtnGlobal'),btnParty=qsIn('#ogxBtnParty');

  // ==== CHAT HOTKEY BEHAVIOR ====
  let chatOpen = false;
  function openChat() {
    // if chat is hidden via settings, don't open it
    if (root.style.display === 'none') return;
    chatOpen = true;
    inputEl.focus();
  }
  function closeChat() {
    chatOpen = false;
    inputEl.blur();
  }

  document.addEventListener('keydown',(e)=>{
    const typing=e.target===inputEl||/INPUT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable;
    if(e.key==='Enter'){
      if(!chatOpen&&!typing){e.preventDefault();openChat();return;}
      if(chatOpen){e.preventDefault();const v=inputEl.value.trim();
        if(v){send({type:'say',text:v});inputEl.value='';}closeChat();return;}
    }
    if(chatOpen){e.stopImmediatePropagation();return;}
  },true);

  sendBtn.onclick=()=>{const v=inputEl.value.trim();if(v)send({type:'say',text:v});inputEl.value='';closeChat();};

  function logLine(name,msg,sys=false){
    const row=document.createElement('div');row.className='ogx-chat-msg';
    const safe=String(msg||'').replace(/[<>]/g,m=>({'<':'&lt;','>':'&gt;'}[m]));
    row.innerHTML = sys
      ? `<span class="ogx-chat-time">[${nowHHMM()}]</span><em>${safe}</em>`
      : `<span class="ogx-chat-time">[${nowHHMM()}]</span><span class="ogx-chat-name">${name}</span> ${safe}`
    logEl.appendChild(row);logEl.scrollTop=logEl.scrollHeight;
  }

  // ==== SOCKETS ====
  const sockets=new Map(),logsByRoom=new Map();
  // per-room reconnect state
  const reconnectTimers=new Map(),reconnectAttempts=new Map();

  let myName=detectGameNick().slice(0,24),mode='global',
      currentCategory=detectCategory(),currentTagSnapshot=currentTag();

  const nick=nicknameEl();
  function applyRename(newN){
    const n=String(newN||'').slice(0,24)||'Anon';
    if(n===myName)return;
    myName=n;
    for(const ws of sockets.values())
      if(ws.readyState===1)try{ws.send(JSON.stringify({type:'rename',name:myName}));}catch{}
  }
  if(nick){
    ['input','change'].forEach(ev=>nick.addEventListener(ev,()=>applyRename(getText(nick))));
    setTimeout(()=>applyRename(getText(nick)),0);
  }

  function activeRoom(){const cat=currentCategory,tag=currentTagSnapshot;return composeRoom(cat,mode,tag)||`${cat}:global`;}
  function roomNamesForCategory(cat){const rooms=[`${cat}:global`];const T=currentTagSnapshot;if(T)rooms.push(`${cat}:party:${T}`);return rooms;}
  function appendToRoomLog(room,from,text,ts){
    if(!logsByRoom.has(room))logsByRoom.set(room,[]);
    logsByRoom.get(room).push({from,text,ts:ts||Date.now()});
    if(room===activeRoom())logLine(from||'•',text);
  }
  function renderRoom(room){
    logEl.innerHTML='';(logsByRoom.get(room)||[]).forEach(m=>logLine(m.from||'•',m.text));
    logEl.scrollTop=logEl.scrollHeight;
  }

  // schedule auto-reconnect for a room (with backoff)
  function scheduleReconnect(room){
    if(!room)return;
    // only reconnect if this room is still "wanted" for the current category
    const want=new Set(roomNamesForCategory(currentCategory));
    if(!want.has(room))return;
    if(reconnectTimers.has(room))return; // already scheduled

    let attempt=reconnectAttempts.get(room)||0;
    attempt++;
    reconnectAttempts.set(room,attempt);
    const delay=Math.min(2000*attempt,15000); // 2s, 4s, 6s... capped at 15s

    const id=setTimeout(()=>{
      reconnectTimers.delete(room);
      ensureSocket(room);
    },delay);
    reconnectTimers.set(room,id);
  }

  function ensureSocket(room){
    if(!room)return;
    const old=sockets.get(room);
    if(old&&old.readyState===1)return;
    if(old)try{old.close();}catch{};

    const u=new URL(CHAT_WS);
    u.searchParams.set('room',room);
    u.searchParams.set('name',myName);
    const k=getSavedKey();
    if(k)u.searchParams.set('key',k);

    const ws=new WebSocket(u);
    sockets.set(room,ws);

    ws.onopen =()=>{
      reconnectAttempts.set(room, 0);              // reset backoff on success
      appendToRoomLog(room, '•', `Connected to ${room}`);

      // NEW: after connect, try to broadcast our skins by playerID
      setTimeout(() => {
        if (activeRoom() === room) {
          broadcastSkinsByPID();
        }
      }, 400);
    };
    ws.onmessage=e=>{
      try{
        const d = JSON.parse(e.data);

        if (d.type === 'msg') {
          appendToRoomLog(room, d.from || '??', d.text || '', d.ts);
        } else if (d.type === 'system') {
          appendToRoomLog(room, '•', d.text || '');
        } else if (d.type === 'skinByPID') {
          // NEW: skin sync by real playerID
          if (window.__ogxSkinsByPID && d.playerID != null && d.skin) {
            window.__ogxSkinsByPID[d.playerID] = String(d.skin);
          }
        } else if (d.type === 'skinSyncByPID' && Array.isArray(d.skins)) {
          if (window.__ogxSkinsByPID) {
            d.skins.forEach(entry => {
              if (entry && entry.playerID != null && entry.skin) {
                window.__ogxSkinsByPID[entry.playerID] = String(entry.skin);
              }
            });
          }
        }
      }catch{
        appendToRoomLog(room, '•', String(e.data || ''));
      }
    };
    ws.onclose =(ev)=>{
      appendToRoomLog(room,'•','Disconnected');
      const code=ev&&ev.code;
      // Don't spam reconnect if the key/origin is invalid or key is banned
      if(code===1008||code===4002){
        sockets.delete(room);
        return;
      }
      scheduleReconnect(room);
    };
    ws.onerror =()=>{
      appendToRoomLog(room,'•','Error');
      // close will fire after this and trigger scheduleReconnect
    };
  }
  function connectCategory(cat){
    const want=new Set(roomNamesForCategory(cat));
    // ensure sockets for wanted rooms
    for(const r of want)ensureSocket(r);
    // close & stop reconnect for rooms we no longer want
    for(const [r,ws] of sockets.entries())if(!want.has(r)){
      const t=reconnectTimers.get(r);
      if(t){clearTimeout(t);reconnectTimers.delete(r);reconnectAttempts.delete(r);}
      try{ws.close();}catch{}
      sockets.delete(r);
    }
    renderRoom(activeRoom());
  }

  function updateHeader(){
    const cat=currentCategory,tag=currentTagSnapshot;
    labelEl.textContent=(mode==='party')?`${cat.toUpperCase()} • PARTY • ${normTag(tag)||'—'}`:`${cat.toUpperCase()} • GLOBAL`;
    renderRoom(activeRoom());
  }
  function send(o){const r=activeRoom(),ws=sockets.get(r);if(ws&&ws.readyState===1)ws.send(JSON.stringify(o));}
  function broadcastSkinsByPID(){
    const room = activeRoom();
    const ws = sockets.get(room);
    if (!ws || ws.readyState !== 1) return;
    if (!window.__ogxPlayerIDByClientType) return;

    const map      = window.__ogxPlayerIDByClientType;
    const lastSent = window.__ogxLastSentSkinByPID || (window.__ogxLastSentSkinByPID = {});

    ['parent','child'].forEach(ctype => {
      const pid = map[ctype];
      if (pid == null) return; // no owned cells yet

      const skin = detectSkinForClientType(ctype);
      if (!skin) return;

      const key = String(pid);

      // 🔒 don't resend if it's the same skin we already sent for this pid
      if (lastSent[key] === skin) return;

      lastSent[key] = skin;

      try {
        ws.send(JSON.stringify({
          type: 'skinByPID',
          playerID: pid,
          skin
        }));
      } catch {}
    });
  }
  window.__ogxBroadcastSkinsByPID = broadcastSkinsByPID;

  const serversSel=qs('#servers');
  if(serversSel)serversSel.addEventListener('change',()=>{
    currentCategory=detectCategory();updateHeader();connectCategory(currentCategory);
  });

  const tEl=tagEl();
  if(tEl){
    const onTag=()=>{currentTagSnapshot=currentTag();updateHeader();connectCategory(currentCategory);};
    tEl.addEventListener('input',onTag);tEl.addEventListener('change',onTag);
    setTimeout(onTag,0);
  }
  const skin1 = skinInputEl(1);
  const skin2 = skinInputEl(2);

  const hookSkin = el => {
    if (!el) return;
    const handler = () => broadcastSkinsByPID();
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  };

  hookSkin(skin1);
  hookSkin(skin2);

  // also try once shortly after load in case values + playerIDs are ready
  setTimeout(() => {
    broadcastSkinsByPID();
  }, 1200);
  btnGlobal.onclick=()=>{mode='global';btnGlobal.classList.add('active');btnParty.classList.remove('active');updateHeader();};
  btnParty.onclick=()=>{
    currentTagSnapshot=currentTag();mode='party';
    btnParty.classList.add('active');btnGlobal.classList.remove('active');
    if(!currentTagSnapshot){logLine('•','Enter a Tag to use Party chat',true);const te=tagEl();if(te)te.focus();}
    updateHeader();connectCategory(currentCategory);
  };

  setTimeout(()=>{applyRename(getText(nicknameEl()));currentTagSnapshot=currentTag();updateHeader();connectCategory(currentCategory);},50);
})();
