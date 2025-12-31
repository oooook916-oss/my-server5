(function () {
  'use strict';
  window.__ogxLastSentSkinByPID = window.__ogxLastSentSkinByPID || {};

  const CHAT_WS = 'wss://my-server5.onrender.com/chat';

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
    if(label.includes('macro')||val.includes(':6001')) return'macro';
    return'ffa';
  }

  function composeRoom(cat,mode,tag){
    if(mode==='party'){const T=normTag(tag);return T?`${cat}:party:${T}`:null;}
    return`${cat}:global`;
  }

  const css=`.ogx-chat{position:fixed;left:12px;bottom:30px;width:360px;height:240px;display:flex;flex-direction:column;
  background:rgba(10,10,10,.40);border:1px solid rgba(255,255,255,.1);
  border-radius:12px;color:#fff;font:12px/1.4 system-ui;z-index:2147483647}
  .ogx-chat-header{display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.08)}
  .ogx-chat-badge{font-weight:600;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.08)}
  .ogx-chat-toggle{margin-left:auto;display:flex;gap:6px}
  .ogx-chat-toggle button{padding:4px 8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;border-radius:999px;cursor:pointer}
  .ogx-chat-body{flex:1;overflow:auto;padding:8px}
  .ogx-chat-msg{margin:4px 0}.ogx-chat-time{opacity:.6;margin-right:6px}
  .ogx-chat-foot{display:flex;gap:6px;padding:8px;border-top:1px solid rgba(255,255,255,.08)}
  .ogx-chat-foot input{flex:1;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.25);color:#fff}`;
  
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  const root=document.createElement('div');
  root.className='ogx-chat';
  root.innerHTML=`
  <div class="ogx-chat-header">
    <span class="ogx-chat-badge" id="ogxRoomLabel">...</span>
    <div class="ogx-chat-toggle"><button id="ogxBtnGlobal" class="active">Global</button><button id="ogxBtnParty">Party</button></div>
  </div>
  <div class="ogx-chat-body" id="ogxLog"></div>
  <div class="ogx-chat-foot">
    <input id="ogxInput" type="text" maxlength="300" placeholder="Type message...">
    <button id="ogxSend">Send</button>
  </div>`;
  document.body.appendChild(root);

  const logEl=qs('#ogxLog',root), inputEl=qs('#ogxInput',root), labelEl=qs('#ogxRoomLabel',root);
  const sockets=new Map(), logsByRoom=new Map();
  let myName=detectGameNick(), mode='global', currentCategory=detectCategory(), currentTagSnapshot=currentTag();

  function logLine(name,msg){
    const row=document.createElement('div');row.className='ogx-chat-msg';
    row.innerHTML=`<span class="ogx-chat-time">[${nowHHMM()}]</span><b>${name}:</b> ${msg}`;
    logEl.appendChild(row);logEl.scrollTop=logEl.scrollHeight;
  }

  function ensureSocket(room){
    if(sockets.has(room)) return;
    const ws=new WebSocket(`${CHAT_WS}?room=${room}&name=${myName}`);
    sockets.set(room,ws);
    ws.onopen=()=>logLine('System',`Connected to ${room}`);
    ws.onmessage=e=>{const d=JSON.parse(e.data); if(d.type==='msg') logLine(d.from,d.text);};
    ws.onclose=()=> { sockets.delete(room); setTimeout(()=>ensureSocket(room),3000); };
  }

  function activeRoom(){return composeRoom(currentCategory,mode,currentTagSnapshot);}

  qs('#ogxSend',root).onclick=()=>{
    const v=inputEl.value.trim();
    const ws=sockets.get(activeRoom());
    if(v && ws && ws.readyState===1){ ws.send(JSON.stringify({type:'say',text:v})); inputEl.value=''; }
  };

  setInterval(()=>{
    const room=activeRoom();
    if(room) ensureSocket(room);
    labelEl.textContent = room.toUpperCase();
  },2000);

})();
