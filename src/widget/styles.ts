export const WIDGET_CSS = `
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
`;
