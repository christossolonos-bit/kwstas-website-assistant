"use strict";(()=>{var B=/[\u0370-\u03FF\u1F00-\u1FFF]/;function g(a){let t=a.trim();if(!t)return"en";let i=0,e=0;for(let n of t)B.test(n)?i+=1:/[A-Za-z]/.test(n)&&(e+=1);return i===0&&e===0?"en":i>=1?"el":"en"}function f(a,t){let i=a.trim();if(!i)return t==="el"?"el":"en";let e=g(i);return/[\u0370-\u03FF\u1F00-\u1FFF]/.test(i)?"el":/[A-Za-z]/.test(i)?"en":t==="el"||t==="en"?t:e}var C={en:{title:"Site Assistant",subtitle:"Ask anything \xB7 voice answers \xB7 EL/EN",placeholder:"Type in Greek or English\u2026",thinking:"Thinking\u2026",speaking:"Speaking\u2026",listening:"Listening\u2026 tap mic to stop",transcribing:"Transcribing\u2026",goingTo:a=>`Going to ${a}\u2026`,openPage:"Open page",micDenied:"Microphone permission denied",micUnsupported:"Microphone not supported in this browser",sttEmpty:"Didn't catch that \u2014 try again",ttsBlocked:"Tap unmute / interact to enable audio",ttsUnavailable:"Voice unavailable \u2014 answer shown as text",sorry:a=>`Sorry \u2014 ${a}`,mute:"Mute voice",unmute:"Unmute voice",minimize:"Minimize",openAssistant:"Open assistant",speak:"Speak",send:"Send",scanning:"Learning this page\u2026",scanned:"Ready \u2014 ask me about this site"},el:{title:"\u0392\u03BF\u03B7\u03B8\u03CC\u03C2 \u0399\u03C3\u03C4\u03CC\u03C4\u03BF\u03C0\u03BF\u03C5",subtitle:"\u03A1\u03C9\u03C4\u03AE\u03C3\u03C4\u03B5 \u03CC,\u03C4\u03B9 \u03B8\u03AD\u03BB\u03B5\u03C4\u03B5 \xB7 \u03C6\u03C9\u03BD\u03B7\u03C4\u03B9\u03BA\u03AD\u03C2 \u03B1\u03C0\u03B1\u03BD\u03C4\u03AE\u03C3\u03B5\u03B9\u03C2 \xB7 EL/EN",placeholder:"\u0393\u03C1\u03AC\u03C8\u03C4\u03B5 \u03C3\u03C4\u03B1 \u03B5\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC \u03AE \u03B1\u03B3\u03B3\u03BB\u03B9\u03BA\u03AC\u2026",thinking:"\u03A3\u03BA\u03AD\u03C6\u03C4\u03BF\u03BC\u03B1\u03B9\u2026",speaking:"\u039C\u03B9\u03BB\u03CE\u2026",listening:"\u0391\u03BA\u03BF\u03CD\u03C9\u2026 \u03C0\u03B1\u03C4\u03AE\u03C3\u03C4\u03B5 \u03C4\u03BF \u03BC\u03B9\u03BA\u03C1\u03CC\u03C6\u03C9\u03BD\u03BF \u03B3\u03B9\u03B1 \u03C4\u03AD\u03BB\u03BF\u03C2",transcribing:"\u039C\u03B5\u03C4\u03B1\u03C4\u03C1\u03BF\u03C0\u03AE \u03BF\u03BC\u03B9\u03BB\u03AF\u03B1\u03C2\u2026",goingTo:a=>`\u039C\u03B5\u03C4\u03B1\u03C6\u03BF\u03C1\u03AC \u03C3\u03B5 ${a}\u2026`,openPage:"\u0386\u03BD\u03BF\u03B9\u03B3\u03BC\u03B1 \u03C3\u03B5\u03BB\u03AF\u03B4\u03B1\u03C2",micDenied:"\u0394\u03B5\u03BD \u03B4\u03CC\u03B8\u03B7\u03BA\u03B5 \u03AC\u03B4\u03B5\u03B9\u03B1 \u03BC\u03B9\u03BA\u03C1\u03BF\u03C6\u03CE\u03BD\u03BF\u03C5",micUnsupported:"\u03A4\u03BF \u03BC\u03B9\u03BA\u03C1\u03CC\u03C6\u03C9\u03BD\u03BF \u03B4\u03B5\u03BD \u03C5\u03C0\u03BF\u03C3\u03C4\u03B7\u03C1\u03AF\u03B6\u03B5\u03C4\u03B1\u03B9 \u03C3\u03B5 \u03B1\u03C5\u03C4\u03CC\u03BD \u03C4\u03BF\u03BD \u03C0\u03B5\u03C1\u03B9\u03B7\u03B3\u03B7\u03C4\u03AE",sttEmpty:"\u0394\u03B5\u03BD \u03BA\u03B1\u03C4\u03AC\u03BB\u03B1\u03B2\u03B1 \u2014 \u03B4\u03BF\u03BA\u03B9\u03BC\u03AC\u03C3\u03C4\u03B5 \u03BE\u03B1\u03BD\u03AC",ttsBlocked:"\u03A0\u03B1\u03C4\u03AE\u03C3\u03C4\u03B5 \u03B3\u03B9\u03B1 \u03BD\u03B1 \u03B5\u03BD\u03B5\u03C1\u03B3\u03BF\u03C0\u03BF\u03B9\u03B7\u03B8\u03B5\u03AF \u03BF \u03AE\u03C7\u03BF\u03C2",ttsUnavailable:"\u0397 \u03C6\u03C9\u03BD\u03AE \u03B4\u03B5\u03BD \u03B5\u03AF\u03BD\u03B1\u03B9 \u03B4\u03B9\u03B1\u03B8\u03AD\u03C3\u03B9\u03BC\u03B7 \u2014 \u03B7 \u03B1\u03C0\u03AC\u03BD\u03C4\u03B7\u03C3\u03B7 \u03B5\u03AF\u03BD\u03B1\u03B9 \u03C3\u03B5 \u03BA\u03B5\u03AF\u03BC\u03B5\u03BD\u03BF",sorry:a=>`\u03A3\u03C5\u03B3\u03B3\u03BD\u03CE\u03BC\u03B7 \u2014 ${a}`,mute:"\u03A3\u03AF\u03B3\u03B1\u03C3\u03B7 \u03C6\u03C9\u03BD\u03AE\u03C2",unmute:"\u0395\u03BD\u03B5\u03C1\u03B3\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B7 \u03C6\u03C9\u03BD\u03AE\u03C2",minimize:"\u0395\u03BB\u03B1\u03C7\u03B9\u03C3\u03C4\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B7",openAssistant:"\u0386\u03BD\u03BF\u03B9\u03B3\u03BC\u03B1 \u03B2\u03BF\u03B7\u03B8\u03BF\u03CD",speak:"\u039F\u03BC\u03B9\u03BB\u03AF\u03B1",send:"\u0391\u03C0\u03BF\u03C3\u03C4\u03BF\u03BB\u03AE",scanning:"\u039C\u03B1\u03B8\u03B1\u03AF\u03BD\u03C9 \u03B1\u03C5\u03C4\u03AE \u03C4\u03B7 \u03C3\u03B5\u03BB\u03AF\u03B4\u03B1\u2026",scanned:"\u0388\u03C4\u03BF\u03B9\u03BC\u03BF\u03C2 \u2014 \u03C1\u03C9\u03C4\u03AE\u03C3\u03C4\u03B5 \u03BC\u03B5 \u03B3\u03B9\u03B1 \u03C4\u03BF\u03BD \u03B9\u03C3\u03C4\u03CC\u03C4\u03BF\u03C0\u03BF"}};function E(a){return C[a]}function L(a){return a?a.startsWith("#")?a:`#${a}`:""}function m(a){try{return new URL(a).origin}catch{return null}}function M(a,t){let i=L(a.hash),e=(a.url||"").trim();if(!e)return"";if(/^https?:\/\//i.test(e))return`${e.split("#")[0]}${i}`;let n=e.startsWith("/")?e.split("#")[0]:`/${e.split("#")[0]}`,s=(t||"").replace(/\/$/,""),c=s?m(s):null,r=window.location.origin;return c&&c===r?`${n}${i}`:s?`${s}${n}${i}`:`${n}${i}`}function R(a){let t=(a||"").replace(/\/$/,""),i=t?m(t):null;return!!(i&&i===window.location.origin)}function b(a,t){let i=M(a,t);if(!i)return;let e=/^https?:\/\//i.test(i)?i:t?`${t.replace(/\/$/,"")}${i.startsWith("/")?i:`/${i}`}`:new URL(i,window.location.origin).href,n=m(e),s=R(t);if(!s&&n&&n!==window.location.origin){window.open(e,"_blank","noopener,noreferrer")||(window.location.href=e);return}let c=L(a.hash),r=(s?i:e).split("#")[0],l=`${window.location.pathname}${window.location.search}`;if(s&&l===r){if(c){let o=c.slice(1),d=document.getElementById(o)||document.querySelector(`[name="${CSS.escape(o)}"]`);d&&d.scrollIntoView({behavior:"smooth",block:"start"}),history.replaceState(null,"",`${r}${c}`)}return}window.location.assign(s?`${r}${c}`:e)}var $=new Set(["SCRIPT","STYLE","NOSCRIPT","SVG","IFRAME","CANVAS","VOICE-SITE-ASSISTANT"]);function v(a){if(a.nodeType===Node.TEXT_NODE)return(a.textContent||"").replace(/\s+/g," ").trim();if(!(a instanceof HTMLElement)||$.has(a.tagName)||a.id==="voice-site-assistant"||a.getAttribute("aria-hidden")==="true")return"";let t=window.getComputedStyle(a);if(t.display==="none"||t.visibility==="hidden")return"";let i="";for(let e of Array.from(a.childNodes)){let n=v(e);n&&(i+=(i?" ":"")+n)}return i.trim()}function U(a){return a.toLowerCase().normalize("NFD").replace(/\p{M}/gu,"").replace(/[^a-z0-9\u0370-\u03ff]+/gi,"-").replace(/^-|-$/g,"").slice(0,64)}function H(a){try{let t=new URL(a,window.location.href);return t.origin!==window.location.origin?null:`${t.pathname}${t.search}`.replace(/\/$/,"")||"/"}catch{return null}}function k(){let a=document.title?.trim()||document.querySelector("h1")?.textContent?.trim()||window.location.pathname,t=document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim()||document.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim()||"",i=document.querySelector('meta[name="keywords"]')?.getAttribute("content")?.split(",").map(l=>l.trim()).filter(Boolean)||[],e=document.querySelector("main")||document.querySelector("article")||document.body,n=[];e.querySelectorAll("h1, h2, h3").forEach((l,o)=>{let d=l,u=(d.textContent||"").replace(/\s+/g," ").trim();if(!u)return;let x=d.id||U(u)||`section-${o}`;d.id||(d.id=x);let y=[],h=d.nextElementSibling;for(;h&&!/^H[1-3]$/.test(h.tagName);){let S=v(h);S&&y.push(S),h=h.nextElementSibling}n.push({id:x,title:u,text:y.join(" ").slice(0,2500)})});let c=v(e).slice(0,35e3),r=new Map;return document.querySelectorAll("a[href]").forEach(l=>{let o=l.getAttribute("href");if(!o||o.startsWith("#")||o.startsWith("mailto:")||o.startsWith("tel:"))return;let d=H(o);if(!d)return;let u=(l.textContent||"").replace(/\s+/g," ").trim();r.has(d)||r.set(d,{url:d,title:u||d})}),{url:`${window.location.pathname}${window.location.search}`||"/",title:a,description:t,content:c,keywords:i.slice(0,30),sections:n.slice(0,40),links:[...r.values()].slice(0,25)}}async function T(a,t=5){let i=[],e=`${window.location.pathname}${window.location.search}`.replace(/\/$/,"")||"/";for(let n of a){if(i.length>=t)break;if(n.url!==e)try{let s=await fetch(n.url,{credentials:"same-origin",headers:{Accept:"text/html"}});if(!s.ok)continue;let c=await s.text(),r=new DOMParser().parseFromString(c,"text/html"),l=r.title?.trim()||r.querySelector("h1")?.textContent?.trim()||n.title,o=r.querySelector('meta[name="description"]')?.getAttribute("content")||"",u=((r.querySelector("main")||r.querySelector("article")||r.body)?.textContent||"").replace(/\s+/g," ").trim().slice(0,6e3);i.push({url:n.url,title:l,description:o||u.slice(0,500)}),u&&(i[i.length-1].description=`${o} ${u}`.trim().slice(0,7e3))}catch{}}return i}var A=`
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
`;function N(){let a=document.currentScript||document.querySelector("script[data-api-base],script[src*='embed.js']"),t=a?.getAttribute("data-api-base")||(a instanceof HTMLScriptElement&&a.src?new URL(a.src).origin:window.location.origin),i=a?.getAttribute("data-auto-scan"),e=a?.getAttribute("data-site-base")||"";return{apiBase:t.replace(/\/$/,""),assistantId:a?.getAttribute("data-assistant-id")||"default",autoScan:i==null?!0:i!=="false",siteBaseUrl:e.replace(/\/$/,"")}}function p(a,t={},i){let e=document.createElement(a);for(let[n,s]of Object.entries(t))n==="class"?e.className=s:e.setAttribute(n,s);return i!=null&&(e.textContent=i),e}var w=class{constructor(t){this.expanded=!0;this.muted=!1;this.busy=!1;this.uiLang="en";this.mediaRecorder=null;this.recognition=null;this.chunks=[];this.audio=null;this.config=t,(typeof navigator<"u"&&navigator.language||"").toLowerCase().startsWith("el")&&(this.uiLang="el"),this.root=p("div",{class:"vsa-root",id:"voice-site-assistant"}),this.shadow=this.root.attachShadow({mode:"open"});let e=p("style");e.textContent=A,this.shadow.appendChild(e),this.mountUi(),this.applyUiCopy(),document.body.appendChild(this.root),this.bootstrap()}t(){return E(this.uiLang)}setUiLang(t){this.uiLang!==t&&(this.uiLang=t,this.applyUiCopy())}applyUiCopy(){let t=this.t();this.titleEl.textContent=t.title,this.subEl.textContent=t.subtitle,this.inputEl.placeholder=t.placeholder,this.fab.setAttribute("aria-label",t.openAssistant),this.fab.title=t.openAssistant,this.muteBtn.title=this.muted?t.unmute:t.mute,this.minBtn.title=t.minimize,this.minBtn.setAttribute("aria-label",t.minimize),this.micBtn.title=t.speak,this.micBtn.setAttribute("aria-label",t.speak),this.sendBtn.title=t.send,this.sendBtn.setAttribute("aria-label",t.send),this.panel.setAttribute("aria-label",t.title)}mountUi(){this.fab=p("button",{class:"vsa-fab",type:"button"}),this.fab.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 5h10v2H7V9zm0 4h7v2H7v-2z"/></svg>',this.fab.style.display="none",this.fab.addEventListener("click",()=>this.setExpanded(!0)),this.panel=p("div",{class:"vsa-panel",role:"dialog"});let t=p("div",{class:"vsa-header"}),i=p("div");this.titleEl=p("div",{class:"vsa-title"}),this.subEl=p("div",{class:"vsa-sub"}),i.append(this.titleEl,this.subEl),t.appendChild(i);let e=p("div",{class:"vsa-header-actions"});this.muteBtn=p("button",{class:"vsa-icon-btn",type:"button","aria-pressed":"false"},"\u{1F50A}"),this.muteBtn.addEventListener("click",()=>{this.muted=!this.muted,this.muteBtn.setAttribute("aria-pressed",String(this.muted)),this.muteBtn.textContent=this.muted?"\u{1F507}":"\u{1F50A}",this.muteBtn.title=this.muted?this.t().unmute:this.t().mute,this.muted&&this.stopAudio()}),this.minBtn=p("button",{class:"vsa-icon-btn",type:"button"},"\u2013"),this.minBtn.addEventListener("click",()=>this.setExpanded(!1)),e.append(this.muteBtn,this.minBtn),t.appendChild(e),this.messagesEl=p("div",{class:"vsa-messages"}),this.statusEl=p("div",{class:"vsa-status"});let n=p("div",{class:"vsa-composer"});this.inputEl=p("textarea",{class:"vsa-input",rows:"1"}),this.inputEl.addEventListener("input",()=>{let s=this.inputEl.value.trim();s&&this.setUiLang(g(s))}),this.inputEl.addEventListener("keydown",s=>{s.key==="Enter"&&!s.shiftKey&&(s.preventDefault(),this.sendText())}),this.micBtn=p("button",{class:"vsa-mic",type:"button"},"\u{1F3A4}"),this.micBtn.addEventListener("click",()=>{this.toggleMic()}),this.sendBtn=p("button",{class:"vsa-send",type:"button"},"\u27A4"),this.sendBtn.addEventListener("click",()=>{this.sendText()}),n.append(this.inputEl,this.micBtn,this.sendBtn),this.panel.append(t,this.messagesEl,this.statusEl,n),this.shadow.append(this.panel,this.fab)}setExpanded(t){this.expanded=t,this.panel.style.display=t?"flex":"none",this.fab.style.display=t?"none":"flex"}setStatus(t){this.statusEl.textContent=t}addMessage(t,i,e){let n=p("div",{class:`vsa-msg ${t}`},i);if(e?.url){let s=p("button",{class:"vsa-nav",type:"button"},`\u2192 ${e.label||this.t().openPage}`);s.addEventListener("click",()=>b(e,this.config.siteBaseUrl)),n.appendChild(document.createElement("br")),n.appendChild(s)}this.messagesEl.appendChild(n),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}async bootstrap(){this.config.autoScan&&this.learnSite();try{let i=await fetch(`${this.config.apiBase}/api/config`);if(i.ok){let e=await i.json();if(e.siteBaseUrl&&(this.config.siteBaseUrl=e.siteBaseUrl.replace(/\/$/,"")),(e.defaultLanguage==="el"||e.defaultLanguage==="en")&&this.setUiLang(e.defaultLanguage),e.welcomeMessage){this.setUiLang(g(e.welcomeMessage)||this.uiLang),this.addMessage("assistant",e.welcomeMessage),this.speak(e.welcomeMessage,g(e.welcomeMessage));return}}}catch{}let t=this.uiLang==="el"?"\u0393\u03B5\u03B9\u03B1 \u03C3\u03B1\u03C2! \u03A1\u03C9\u03C4\u03AE\u03C3\u03C4\u03B5 \u03BC\u03B5 \u03CC\u03C0\u03C9\u03C2 \u03B8\u03B1 \u03C1\u03C9\u03C4\u03BF\u03CD\u03C3\u03B1\u03C4\u03B5 \u03C3\u03C4\u03BF \u03C4\u03B7\u03BB\u03AD\u03C6\u03C9\u03BD\u03BF \u2014 \u03BC\u03C0\u03BF\u03C1\u03CE \u03BD\u03B1 \u03C3\u03B1\u03C2 \u03C0\u03AC\u03C9 \u03C3\u03C4\u03B7 \u03C3\u03C9\u03C3\u03C4\u03AE \u03C3\u03B5\u03BB\u03AF\u03B4\u03B1.":"Hi! Ask me the same things you'd call about \u2014 I can take you to the right page.";this.addMessage("assistant",t)}async learnSite(){try{this.setStatus(this.t().scanning);let t=k(),i=await T(t.links,5),e=new Map(t.links.map(s=>[s.url,s]));for(let s of i)e.set(s.url,{url:s.url,title:s.title,description:s.description});let n=await fetch(`${this.config.apiBase}/api/scan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...t,links:[...e.values()]})});if(!n.ok){let s=await n.json().catch(()=>({}));throw new Error(s.error||"Scan failed")}this.setStatus(this.t().scanned),window.setTimeout(()=>{this.statusEl.textContent===this.t().scanned&&this.setStatus("")},2500)}catch{this.setStatus("")}}async sendText(){let t=this.inputEl.value.trim();!t||this.busy||(this.inputEl.value="",await this.ask(t))}async ask(t){this.busy=!0,this.stopAudio();let i=g(t);this.setUiLang(i),this.addMessage("user",t),this.setStatus(this.t().thinking);try{let e=await fetch(`${this.config.apiBase}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:t,currentUrl:window.location.href,assistantId:this.config.assistantId})}),n=await e.json();if(!e.ok)throw new Error(n.error||"Chat failed");let s=f(n.answer,n.language||i);this.setUiLang(s),this.addMessage("assistant",n.answer,n.navigation),n.navigation?.url&&this.setStatus(this.t().goingTo(n.navigation.label||this.t().openPage)),await this.speak(n.answer,s),n.navigation?.url&&b(n.navigation,this.config.siteBaseUrl),this.setStatus("")}catch(e){let n=e instanceof Error?e.message:"Something went wrong";this.addMessage("assistant",this.t().sorry(n)),this.setStatus("")}finally{this.busy=!1}}stopAudio(){this.audio&&(this.audio.pause(),this.audio.src="",this.audio=null)}speakBrowser(t,i){let e=window.speechSynthesis;return e?new Promise((n,s)=>{e.cancel();let c=new SpeechSynthesisUtterance(t);c.lang=i==="el"?"el-GR":"en-US";let r=e.getVoices(),l=i==="el"?r.find(o=>/^el\b/i.test(o.lang))||r.find(o=>/greek|ελλην/i.test(o.name)):r.find(o=>/^en-US\b/i.test(o.lang))||r.find(o=>/^en\b/i.test(o.lang));l&&(c.voice=l),c.onend=()=>{this.setStatus(""),n()},c.onerror=()=>s(new Error("Browser TTS failed")),this.setStatus(this.t().speaking),e.speak(c)}):Promise.reject(new Error("No speechSynthesis"))}speak(t,i){if(this.muted||!t.trim())return Promise.resolve();let e=f(t,i);return this.setStatus(this.t().speaking),(async()=>{try{let n=await fetch(`${this.config.apiBase}/api/tts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:t,language:e})});if(!n.ok){let l=await n.json().catch(()=>({}));throw new Error(l.error||"TTS failed")}let s=await n.blob();if(!s.size)throw new Error("Empty audio");let c=URL.createObjectURL(s);this.stopAudio();let r=new Audio(c);this.audio=r,await new Promise(l=>{let o=()=>{URL.revokeObjectURL(c),this.setStatus(""),l()};r.onended=o,r.onerror=o,r.play().then(()=>{},()=>{this.setStatus(this.t().ttsBlocked),o()})})}catch{try{await this.speakBrowser(t,e)}catch{this.setStatus(this.t().ttsUnavailable)}}})()}getSpeechRecognition(){let t=window;return t.SpeechRecognition||t.webkitSpeechRecognition||null}async toggleMic(){if(this.recognition){this.recognition.stop();return}if(this.mediaRecorder?.state==="recording"){this.mediaRecorder.stop();return}if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder>"u"){let t=this.getSpeechRecognition();if(t){this.startBrowserRecognition(t);return}this.setStatus(this.t().micUnsupported);return}try{let t=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!0,noiseSuppression:!0}});this.chunks=[];let e=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"].find(s=>MediaRecorder.isTypeSupported(s))||"",n=e?new MediaRecorder(t,{mimeType:e}):new MediaRecorder(t);this.mediaRecorder=n,n.ondataavailable=s=>{s.data.size>0&&this.chunks.push(s.data)},n.onstop=()=>{t.getTracks().forEach(s=>s.stop()),this.micBtn.classList.remove("recording"),this.transcribeAndSend(new Blob(this.chunks,{type:n.mimeType||e||"audio/webm"}))},n.start(250),this.micBtn.classList.add("recording"),this.setStatus(this.t().listening)}catch{this.setStatus(this.t().micDenied)}}startBrowserRecognition(t){let i=new t;this.recognition=i,i.lang=this.uiLang==="el"?"el-GR":"en-US",i.interimResults=!0,i.continuous=!1,i.maxAlternatives=1;let e="";i.onresult=n=>{let s="";for(let r=n.resultIndex;r<n.results.length;r++){let l=n.results[r][0]?.transcript??"";n.results[r].isFinal?e+=l:s+=l}let c=(e||s).trim();c&&(this.inputEl.value=c)},i.onerror=()=>{this.recognition=null,this.micBtn.classList.remove("recording"),this.setStatus(this.t().sttEmpty)},i.onend=()=>{this.recognition=null,this.micBtn.classList.remove("recording");let n=(e||this.inputEl.value).trim();if(!n){this.setStatus(this.t().sttEmpty);return}this.setUiLang(g(n)),this.ask(n)},this.micBtn.classList.add("recording"),this.setStatus(this.t().listening),i.start()}async transcribeAndSend(t){this.setStatus(this.t().transcribing);try{let i=new FormData;i.append("audio",t,"speech.webm"),i.append("language",this.uiLang);let e=await fetch(`${this.config.apiBase}/api/stt`,{method:"POST",body:i}),n=await e.json();if(!e.ok)throw new Error(n.error||"STT failed");let s=(n.text||"").trim();if(!s){this.setStatus(this.t().sttEmpty);return}this.inputEl.value=s,this.setUiLang(g(s)),await this.ask(s)}catch(i){let e=i instanceof Error?i.message:"STT failed";this.setStatus(e)}}};function z(){if(document.getElementById("voice-site-assistant"))return;let a=N(),t=()=>new w(a);document.body?t():document.addEventListener("DOMContentLoaded",t)}z();})();
