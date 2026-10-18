"use strict";(()=>{var L=/[\u0370-\u03FF\u1F00-\u1FFF]/;function h(s){let t=s.trim();if(!t)return"en";let i=0,e=0;for(let n of t)L.test(n)?i+=1:/[A-Za-z]/.test(n)&&(e+=1);return i===0&&e===0?"en":i>=2&&i>=e*.35||i>e?"el":"en"}var T={en:{title:"Site Assistant",subtitle:"Ask anything \xB7 voice answers \xB7 EL/EN",placeholder:"Type in Greek or English\u2026",thinking:"Thinking\u2026",speaking:"Speaking\u2026",listening:"Listening\u2026 tap mic to stop",transcribing:"Transcribing\u2026",goingTo:s=>`Going to ${s}\u2026`,openPage:"Open page",micDenied:"Microphone permission denied",micUnsupported:"Microphone not supported in this browser",sttEmpty:"Didn't catch that \u2014 try again",ttsBlocked:"Tap unmute / interact to enable audio",ttsUnavailable:"Voice unavailable \u2014 answer shown as text",sorry:s=>`Sorry \u2014 ${s}`,mute:"Mute voice",unmute:"Unmute voice",minimize:"Minimize",openAssistant:"Open assistant",speak:"Speak",send:"Send",scanning:"Learning this page\u2026",scanned:"Ready \u2014 ask me about this site"},el:{title:"\u0392\u03BF\u03B7\u03B8\u03CC\u03C2 \u0399\u03C3\u03C4\u03CC\u03C4\u03BF\u03C0\u03BF\u03C5",subtitle:"\u03A1\u03C9\u03C4\u03AE\u03C3\u03C4\u03B5 \u03CC,\u03C4\u03B9 \u03B8\u03AD\u03BB\u03B5\u03C4\u03B5 \xB7 \u03C6\u03C9\u03BD\u03B7\u03C4\u03B9\u03BA\u03AD\u03C2 \u03B1\u03C0\u03B1\u03BD\u03C4\u03AE\u03C3\u03B5\u03B9\u03C2 \xB7 EL/EN",placeholder:"\u0393\u03C1\u03AC\u03C8\u03C4\u03B5 \u03C3\u03C4\u03B1 \u03B5\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC \u03AE \u03B1\u03B3\u03B3\u03BB\u03B9\u03BA\u03AC\u2026",thinking:"\u03A3\u03BA\u03AD\u03C6\u03C4\u03BF\u03BC\u03B1\u03B9\u2026",speaking:"\u039C\u03B9\u03BB\u03CE\u2026",listening:"\u0391\u03BA\u03BF\u03CD\u03C9\u2026 \u03C0\u03B1\u03C4\u03AE\u03C3\u03C4\u03B5 \u03C4\u03BF \u03BC\u03B9\u03BA\u03C1\u03CC\u03C6\u03C9\u03BD\u03BF \u03B3\u03B9\u03B1 \u03C4\u03AD\u03BB\u03BF\u03C2",transcribing:"\u039C\u03B5\u03C4\u03B1\u03C4\u03C1\u03BF\u03C0\u03AE \u03BF\u03BC\u03B9\u03BB\u03AF\u03B1\u03C2\u2026",goingTo:s=>`\u039C\u03B5\u03C4\u03B1\u03C6\u03BF\u03C1\u03AC \u03C3\u03B5 ${s}\u2026`,openPage:"\u0386\u03BD\u03BF\u03B9\u03B3\u03BC\u03B1 \u03C3\u03B5\u03BB\u03AF\u03B4\u03B1\u03C2",micDenied:"\u0394\u03B5\u03BD \u03B4\u03CC\u03B8\u03B7\u03BA\u03B5 \u03AC\u03B4\u03B5\u03B9\u03B1 \u03BC\u03B9\u03BA\u03C1\u03BF\u03C6\u03CE\u03BD\u03BF\u03C5",micUnsupported:"\u03A4\u03BF \u03BC\u03B9\u03BA\u03C1\u03CC\u03C6\u03C9\u03BD\u03BF \u03B4\u03B5\u03BD \u03C5\u03C0\u03BF\u03C3\u03C4\u03B7\u03C1\u03AF\u03B6\u03B5\u03C4\u03B1\u03B9 \u03C3\u03B5 \u03B1\u03C5\u03C4\u03CC\u03BD \u03C4\u03BF\u03BD \u03C0\u03B5\u03C1\u03B9\u03B7\u03B3\u03B7\u03C4\u03AE",sttEmpty:"\u0394\u03B5\u03BD \u03BA\u03B1\u03C4\u03AC\u03BB\u03B1\u03B2\u03B1 \u2014 \u03B4\u03BF\u03BA\u03B9\u03BC\u03AC\u03C3\u03C4\u03B5 \u03BE\u03B1\u03BD\u03AC",ttsBlocked:"\u03A0\u03B1\u03C4\u03AE\u03C3\u03C4\u03B5 \u03B3\u03B9\u03B1 \u03BD\u03B1 \u03B5\u03BD\u03B5\u03C1\u03B3\u03BF\u03C0\u03BF\u03B9\u03B7\u03B8\u03B5\u03AF \u03BF \u03AE\u03C7\u03BF\u03C2",ttsUnavailable:"\u0397 \u03C6\u03C9\u03BD\u03AE \u03B4\u03B5\u03BD \u03B5\u03AF\u03BD\u03B1\u03B9 \u03B4\u03B9\u03B1\u03B8\u03AD\u03C3\u03B9\u03BC\u03B7 \u2014 \u03B7 \u03B1\u03C0\u03AC\u03BD\u03C4\u03B7\u03C3\u03B7 \u03B5\u03AF\u03BD\u03B1\u03B9 \u03C3\u03B5 \u03BA\u03B5\u03AF\u03BC\u03B5\u03BD\u03BF",sorry:s=>`\u03A3\u03C5\u03B3\u03B3\u03BD\u03CE\u03BC\u03B7 \u2014 ${s}`,mute:"\u03A3\u03AF\u03B3\u03B1\u03C3\u03B7 \u03C6\u03C9\u03BD\u03AE\u03C2",unmute:"\u0395\u03BD\u03B5\u03C1\u03B3\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B7 \u03C6\u03C9\u03BD\u03AE\u03C2",minimize:"\u0395\u03BB\u03B1\u03C7\u03B9\u03C3\u03C4\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B7",openAssistant:"\u0386\u03BD\u03BF\u03B9\u03B3\u03BC\u03B1 \u03B2\u03BF\u03B7\u03B8\u03BF\u03CD",speak:"\u039F\u03BC\u03B9\u03BB\u03AF\u03B1",send:"\u0391\u03C0\u03BF\u03C3\u03C4\u03BF\u03BB\u03AE",scanning:"\u039C\u03B1\u03B8\u03B1\u03AF\u03BD\u03C9 \u03B1\u03C5\u03C4\u03AE \u03C4\u03B7 \u03C3\u03B5\u03BB\u03AF\u03B4\u03B1\u2026",scanned:"\u0388\u03C4\u03BF\u03B9\u03BC\u03BF\u03C2 \u2014 \u03C1\u03C9\u03C4\u03AE\u03C3\u03C4\u03B5 \u03BC\u03B5 \u03B3\u03B9\u03B1 \u03C4\u03BF\u03BD \u03B9\u03C3\u03C4\u03CC\u03C4\u03BF\u03C0\u03BF"}};function x(s){return T[s]}function A(s){if(s.startsWith("http"))try{let t=new URL(s);return t.origin===window.location.origin?`${t.pathname}${t.search}${t.hash}`:s}catch{return s}return s}function m(s){let t=s.hash?s.hash.startsWith("#")?s.hash:`#${s.hash}`:"",i=A(s.url);if(i.startsWith("http")){window.location.href=t?`${i.split("#")[0]}${t}`:i;return}let[e]=i.split("#"),n=`${e}${t}`;if(`${window.location.pathname}${window.location.search}${window.location.hash}`.split("#")[0]===e){if(t){let l=t.slice(1),o=document.getElementById(l)||document.querySelector(`[name="${CSS.escape(l)}"]`);o&&o.scrollIntoView({behavior:"smooth",block:"start"}),history.replaceState(null,"",`${e}${t}`)}return}window.location.assign(n)}var B=new Set(["SCRIPT","STYLE","NOSCRIPT","SVG","IFRAME","CANVAS","VOICE-SITE-ASSISTANT"]);function f(s){if(s.nodeType===Node.TEXT_NODE)return(s.textContent||"").replace(/\s+/g," ").trim();if(!(s instanceof HTMLElement)||B.has(s.tagName)||s.id==="voice-site-assistant"||s.getAttribute("aria-hidden")==="true")return"";let t=window.getComputedStyle(s);if(t.display==="none"||t.visibility==="hidden")return"";let i="";for(let e of Array.from(s.childNodes)){let n=f(e);n&&(i+=(i?" ":"")+n)}return i.trim()}function M(s){return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu,"").replace(/[^a-z0-9\u0370-\u03ff]+/gi,"-").replace(/^-|-$/g,"").slice(0,64)}function C(s){try{let t=new URL(s,window.location.href);return t.origin!==window.location.origin?null:`${t.pathname}${t.search}`.replace(/\/$/,"")||"/"}catch{return null}}function S(){let s=document.title?.trim()||document.querySelector("h1")?.textContent?.trim()||window.location.pathname,t=document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim()||document.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim()||"",i=document.querySelector('meta[name="keywords"]')?.getAttribute("content")?.split(",").map(d=>d.trim()).filter(Boolean)||[],e=document.querySelector("main")||document.querySelector("article")||document.body,n=[];e.querySelectorAll("h1, h2, h3").forEach((d,r)=>{let p=d,u=(p.textContent||"").replace(/\s+/g," ").trim();if(!u)return;let v=p.id||M(u)||`section-${r}`;p.id||(p.id=v);let y=[],g=p.nextElementSibling;for(;g&&!/^H[1-3]$/.test(g.tagName);){let w=f(g);w&&y.push(w),g=g.nextElementSibling}n.push({id:v,title:u,text:y.join(" ").slice(0,2500)})});let l=f(e).slice(0,35e3),o=new Map;return document.querySelectorAll("a[href]").forEach(d=>{let r=d.getAttribute("href");if(!r||r.startsWith("#")||r.startsWith("mailto:")||r.startsWith("tel:"))return;let p=C(r);if(!p)return;let u=(d.textContent||"").replace(/\s+/g," ").trim();o.has(p)||o.set(p,{url:p,title:u||p})}),{url:`${window.location.pathname}${window.location.search}`||"/",title:s,description:t,content:l,keywords:i.slice(0,30),sections:n.slice(0,40),links:[...o.values()].slice(0,25)}}async function E(s,t=5){let i=[],e=`${window.location.pathname}${window.location.search}`.replace(/\/$/,"")||"/";for(let n of s){if(i.length>=t)break;if(n.url!==e)try{let a=await fetch(n.url,{credentials:"same-origin",headers:{Accept:"text/html"}});if(!a.ok)continue;let l=await a.text(),o=new DOMParser().parseFromString(l,"text/html"),d=o.title?.trim()||o.querySelector("h1")?.textContent?.trim()||n.title,r=o.querySelector('meta[name="description"]')?.getAttribute("content")||"",u=((o.querySelector("main")||o.querySelector("article")||o.body)?.textContent||"").replace(/\s+/g," ").trim().slice(0,6e3);i.push({url:n.url,title:d,description:r||u.slice(0,500)}),u&&(i[i.length-1].description=`${r} ${u}`.trim().slice(0,7e3))}catch{}}return i}var k=`
:host, .vsa-root {
  all: initial;
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: #1a1f24;
}
.vsa-root {
  position: fixed;
  z-index: 2147483000;
  right: 20px;
  bottom: 20px;
  box-sizing: border-box;
}
.vsa-root * { box-sizing: border-box; }

.vsa-fab {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: linear-gradient(145deg, #1f6f5b 0%, #0f3d34 100%);
  color: #f4f7f6;
  box-shadow: 0 10px 28px rgba(15, 61, 52, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.vsa-fab:hover { transform: translateY(-2px) scale(1.03); }
.vsa-fab svg { width: 26px; height: 26px; fill: currentColor; }

.vsa-panel {
  width: min(380px, calc(100vw - 32px));
  height: min(560px, calc(100vh - 40px));
  background: linear-gradient(180deg, #f7faf8 0%, #eef3f1 100%);
  border: 1px solid rgba(15, 61, 52, 0.12);
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(16, 24, 22, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: vsa-in 0.22s ease;
}
@keyframes vsa-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.vsa-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 14px 12px;
  background: linear-gradient(120deg, #0f3d34, #1f6f5b);
  color: #f5faf8;
}
.vsa-title {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.01em;
}
.vsa-sub {
  font-size: 11px;
  opacity: 0.85;
  margin-top: 2px;
}
.vsa-header-actions { display: flex; gap: 6px; }
.vsa-icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.12);
  color: inherit;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.vsa-icon-btn:hover { background: rgba(255,255,255,0.22); }
.vsa-icon-btn[aria-pressed="true"] { background: rgba(255,255,255,0.28); }

.vsa-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.vsa-msg {
  max-width: 92%;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.45;
  white-space: pre-wrap;
}
.vsa-msg.user {
  align-self: flex-end;
  background: #d7ebe3;
  color: #12352d;
  border-bottom-right-radius: 4px;
}
.vsa-msg.assistant {
  align-self: flex-start;
  background: #ffffff;
  border: 1px solid rgba(15,61,52,0.08);
  border-bottom-left-radius: 4px;
}
.vsa-nav {
  display: inline-flex;
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #e7f3ef;
  color: #0f3d34;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
}
.vsa-nav:hover { background: #d5ebe3; }

.vsa-composer {
  border-top: 1px solid rgba(15,61,52,0.08);
  padding: 10px;
  display: flex;
  gap: 8px;
  align-items: flex-end;
  background: rgba(255,255,255,0.7);
}
.vsa-input {
  flex: 1;
  min-height: 42px;
  max-height: 110px;
  resize: none;
  border: 1px solid rgba(15,61,52,0.16);
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  font-size: 13.5px;
  outline: none;
  background: #fff;
  color: #1a1f24;
}
.vsa-input:focus { border-color: #1f6f5b; box-shadow: 0 0 0 3px rgba(31,111,91,0.15); }
.vsa-send, .vsa-mic {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  color: #fff;
  background: #1f6f5b;
  font-size: 16px;
}
.vsa-mic.recording {
  background: #b33a3a;
  animation: vsa-pulse 1s infinite;
}
@keyframes vsa-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
.vsa-send:disabled, .vsa-mic:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.vsa-status {
  font-size: 11px;
  color: #5b6b66;
  padding: 0 14px 8px;
  min-height: 16px;
}
`;function $(){let s=document.currentScript||document.querySelector("script[data-api-base],script[src*='embed.js']"),t=s?.getAttribute("data-api-base")||(s instanceof HTMLScriptElement&&s.src?new URL(s.src).origin:window.location.origin),i=s?.getAttribute("data-auto-scan");return{apiBase:t.replace(/\/$/,""),assistantId:s?.getAttribute("data-assistant-id")||"default",autoScan:i==null?!0:i!=="false"}}function c(s,t={},i){let e=document.createElement(s);for(let[n,a]of Object.entries(t))n==="class"?e.className=a:e.setAttribute(n,a);return i!=null&&(e.textContent=i),e}var b=class{constructor(t){this.expanded=!0;this.muted=!1;this.busy=!1;this.uiLang="en";this.mediaRecorder=null;this.chunks=[];this.audio=null;this.config=t,(typeof navigator<"u"&&navigator.language||"").toLowerCase().startsWith("el")&&(this.uiLang="el"),this.root=c("div",{class:"vsa-root",id:"voice-site-assistant"}),this.shadow=this.root.attachShadow({mode:"open"});let e=c("style");e.textContent=k,this.shadow.appendChild(e),this.mountUi(),this.applyUiCopy(),document.body.appendChild(this.root),this.bootstrap()}t(){return x(this.uiLang)}setUiLang(t){this.uiLang!==t&&(this.uiLang=t,this.applyUiCopy())}applyUiCopy(){let t=this.t();this.titleEl.textContent=t.title,this.subEl.textContent=t.subtitle,this.inputEl.placeholder=t.placeholder,this.fab.setAttribute("aria-label",t.openAssistant),this.fab.title=t.openAssistant,this.muteBtn.title=this.muted?t.unmute:t.mute,this.minBtn.title=t.minimize,this.minBtn.setAttribute("aria-label",t.minimize),this.micBtn.title=t.speak,this.micBtn.setAttribute("aria-label",t.speak),this.sendBtn.title=t.send,this.sendBtn.setAttribute("aria-label",t.send),this.panel.setAttribute("aria-label",t.title)}mountUi(){this.fab=c("button",{class:"vsa-fab",type:"button"}),this.fab.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 5h10v2H7V9zm0 4h7v2H7v-2z"/></svg>',this.fab.style.display="none",this.fab.addEventListener("click",()=>this.setExpanded(!0)),this.panel=c("div",{class:"vsa-panel",role:"dialog"});let t=c("div",{class:"vsa-header"}),i=c("div");this.titleEl=c("div",{class:"vsa-title"}),this.subEl=c("div",{class:"vsa-sub"}),i.append(this.titleEl,this.subEl),t.appendChild(i);let e=c("div",{class:"vsa-header-actions"});this.muteBtn=c("button",{class:"vsa-icon-btn",type:"button","aria-pressed":"false"},"\u{1F50A}"),this.muteBtn.addEventListener("click",()=>{this.muted=!this.muted,this.muteBtn.setAttribute("aria-pressed",String(this.muted)),this.muteBtn.textContent=this.muted?"\u{1F507}":"\u{1F50A}",this.muteBtn.title=this.muted?this.t().unmute:this.t().mute,this.muted&&this.stopAudio()}),this.minBtn=c("button",{class:"vsa-icon-btn",type:"button"},"\u2013"),this.minBtn.addEventListener("click",()=>this.setExpanded(!1)),e.append(this.muteBtn,this.minBtn),t.appendChild(e),this.messagesEl=c("div",{class:"vsa-messages"}),this.statusEl=c("div",{class:"vsa-status"});let n=c("div",{class:"vsa-composer"});this.inputEl=c("textarea",{class:"vsa-input",rows:"1"}),this.inputEl.addEventListener("input",()=>{let a=this.inputEl.value.trim();a&&this.setUiLang(h(a))}),this.inputEl.addEventListener("keydown",a=>{a.key==="Enter"&&!a.shiftKey&&(a.preventDefault(),this.sendText())}),this.micBtn=c("button",{class:"vsa-mic",type:"button"},"\u{1F3A4}"),this.micBtn.addEventListener("click",()=>{this.toggleMic()}),this.sendBtn=c("button",{class:"vsa-send",type:"button"},"\u27A4"),this.sendBtn.addEventListener("click",()=>{this.sendText()}),n.append(this.inputEl,this.micBtn,this.sendBtn),this.panel.append(t,this.messagesEl,this.statusEl,n),this.shadow.append(this.panel,this.fab)}setExpanded(t){this.expanded=t,this.panel.style.display=t?"flex":"none",this.fab.style.display=t?"none":"flex"}setStatus(t){this.statusEl.textContent=t}addMessage(t,i,e){let n=c("div",{class:`vsa-msg ${t}`},i);if(e?.url){let a=c("button",{class:"vsa-nav",type:"button"},`\u2192 ${e.label||this.t().openPage}`);a.addEventListener("click",()=>m(e)),n.appendChild(document.createElement("br")),n.appendChild(a)}this.messagesEl.appendChild(n),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}async bootstrap(){this.config.autoScan&&this.learnSite();try{let i=await fetch(`${this.config.apiBase}/api/config`);if(i.ok){let e=await i.json();if((e.defaultLanguage==="el"||e.defaultLanguage==="en")&&this.setUiLang(e.defaultLanguage),e.welcomeMessage){this.setUiLang(h(e.welcomeMessage)||this.uiLang),this.addMessage("assistant",e.welcomeMessage),this.speak(e.welcomeMessage,h(e.welcomeMessage));return}}}catch{}let t=this.uiLang==="el"?"\u0393\u03B5\u03B9\u03B1 \u03C3\u03B1\u03C2! \u03A1\u03C9\u03C4\u03AE\u03C3\u03C4\u03B5 \u03BC\u03B5 \u03CC\u03C0\u03C9\u03C2 \u03B8\u03B1 \u03C1\u03C9\u03C4\u03BF\u03CD\u03C3\u03B1\u03C4\u03B5 \u03C3\u03C4\u03BF \u03C4\u03B7\u03BB\u03AD\u03C6\u03C9\u03BD\u03BF \u2014 \u03BC\u03C0\u03BF\u03C1\u03CE \u03BD\u03B1 \u03C3\u03B1\u03C2 \u03C0\u03AC\u03C9 \u03C3\u03C4\u03B7 \u03C3\u03C9\u03C3\u03C4\u03AE \u03C3\u03B5\u03BB\u03AF\u03B4\u03B1.":"Hi! Ask me the same things you'd call about \u2014 I can take you to the right page.";this.addMessage("assistant",t)}async learnSite(){try{this.setStatus(this.t().scanning);let t=S(),i=await E(t.links,5),e=new Map(t.links.map(a=>[a.url,a]));for(let a of i)e.set(a.url,{url:a.url,title:a.title,description:a.description});let n=await fetch(`${this.config.apiBase}/api/scan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...t,links:[...e.values()]})});if(!n.ok){let a=await n.json().catch(()=>({}));throw new Error(a.error||"Scan failed")}this.setStatus(this.t().scanned),window.setTimeout(()=>{this.statusEl.textContent===this.t().scanned&&this.setStatus("")},2500)}catch{this.setStatus("")}}async sendText(){let t=this.inputEl.value.trim();!t||this.busy||(this.inputEl.value="",await this.ask(t))}async ask(t){this.busy=!0,this.stopAudio();let i=h(t);this.setUiLang(i),this.addMessage("user",t),this.setStatus(this.t().thinking);try{let e=await fetch(`${this.config.apiBase}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:t,currentUrl:window.location.href,assistantId:this.config.assistantId})}),n=await e.json();if(!e.ok)throw new Error(n.error||"Chat failed");let a=n.language||h(n.answer)||i;this.setUiLang(a),this.addMessage("assistant",n.answer,n.navigation),n.navigation?.url&&this.setStatus(this.t().goingTo(n.navigation.label||this.t().openPage)),await this.speak(n.answer,a),n.navigation?.url?m(n.navigation):this.setStatus("")}catch(e){let n=e instanceof Error?e.message:"Something went wrong";this.addMessage("assistant",this.t().sorry(n)),this.setStatus("")}finally{this.busy=!1}}stopAudio(){this.audio&&(this.audio.pause(),this.audio.src="",this.audio=null)}speakBrowser(t,i){let e=window.speechSynthesis;return e?new Promise((n,a)=>{e.cancel();let l=new SpeechSynthesisUtterance(t);l.lang=i==="el"?"el-GR":"en-US";let o=e.getVoices(),d=o.find(r=>i==="el"?/el(-|_)?GR|Greek/i.test(`${r.lang} ${r.name}`):/en(-|_)?US/i.test(r.lang)&&/Jenny|Aria|Female|Natural/i.test(r.name))||o.find(r=>i==="el"?r.lang.toLowerCase().startsWith("el"):r.lang.toLowerCase().startsWith("en"));d&&(l.voice=d),l.onend=()=>{this.setStatus(""),n()},l.onerror=()=>a(new Error("Browser TTS failed")),this.setStatus(this.t().speaking),e.speak(l)}):Promise.reject(new Error("No speechSynthesis"))}speak(t,i){if(this.muted||!t.trim())return Promise.resolve();let e=i??h(t);return this.setStatus(this.t().speaking),(async()=>{try{let n=await fetch(`${this.config.apiBase}/api/tts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:t,language:e})});if(!n.ok){let d=await n.json().catch(()=>({}));throw new Error(d.error||"TTS failed")}let a=await n.blob();if(!a.size)throw new Error("Empty audio");let l=URL.createObjectURL(a);this.stopAudio();let o=new Audio(l);this.audio=o,await new Promise(d=>{let r=()=>{URL.revokeObjectURL(l),this.setStatus(""),d()};o.onended=r,o.onerror=r,o.play().then(()=>{},()=>{this.setStatus(this.t().ttsBlocked),r()})})}catch{try{await this.speakBrowser(t,e)}catch{this.setStatus(this.t().ttsUnavailable)}}})()}async toggleMic(){if(this.mediaRecorder?.state==="recording"){this.mediaRecorder.stop();return}if(!navigator.mediaDevices?.getUserMedia){this.setStatus(this.t().micUnsupported);return}try{let t=await navigator.mediaDevices.getUserMedia({audio:!0});this.chunks=[];let i=new MediaRecorder(t);this.mediaRecorder=i,i.ondataavailable=e=>{e.data.size>0&&this.chunks.push(e.data)},i.onstop=()=>{t.getTracks().forEach(e=>e.stop()),this.micBtn.classList.remove("recording"),this.transcribeAndSend(new Blob(this.chunks,{type:"audio/webm"}))},i.start(),this.micBtn.classList.add("recording"),this.setStatus(this.t().listening)}catch{this.setStatus(this.t().micDenied)}}async transcribeAndSend(t){this.setStatus(this.t().transcribing);try{let i=new FormData;i.append("audio",t,"speech.webm"),i.append("language",this.uiLang);let e=await fetch(`${this.config.apiBase}/api/stt`,{method:"POST",body:i}),n=await e.json();if(!e.ok)throw new Error(n.error||"STT failed");let a=(n.text||"").trim();if(!a){this.setStatus(this.t().sttEmpty);return}this.inputEl.value=a,await this.ask(a)}catch(i){let e=i instanceof Error?i.message:"STT failed";this.setStatus(e)}}};function U(){if(document.getElementById("voice-site-assistant"))return;let s=$(),t=()=>new b(s);document.body?t():document.addEventListener("DOMContentLoaded",t)}U();})();
