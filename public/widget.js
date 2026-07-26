(function () {
  // Prevent duplicate script execution
  if (window.__AiVoiceWidgetLoaded && window.__AiVoiceWidgetInstance) {
    return;
  }
  window.__AiVoiceWidgetLoaded = true;

  // Find configuration script element
  function getScriptElement() {
    if (document.currentScript) return document.currentScript;
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].getAttribute('data-tenant-id') || (scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1)) {
        return scripts[i];
      }
    }
    return null;
  }

  var currentScript = getScriptElement();
  var globalConfig = window.AiVoiceWidgetConfig || {};

  var tenantId = (currentScript && currentScript.getAttribute('data-tenant-id')) || globalConfig.tenantId || '';
  var agentId = (currentScript && currentScript.getAttribute('data-agent-id')) || globalConfig.agentId || '';
  var themeColor = (currentScript && currentScript.getAttribute('data-color')) || globalConfig.color || '#4f46e5';
  var position = (currentScript && currentScript.getAttribute('data-position')) || globalConfig.position || 'bottom-right';
  var themeMode = (currentScript && currentScript.getAttribute('data-theme')) || globalConfig.theme || 'dark'; // 'dark' | 'light' | 'system'
  var langMode = (currentScript && currentScript.getAttribute('data-lang')) || globalConfig.lang || 'id'; // 'id' | 'en'

  // Localized dictionaries
  var i18n = {
    id: {
      defaultTitle: 'Tanya AI Voice',
      defaultSubtitle: 'Layanan Suara AI 24/7',
      welcome: '👋 Selamat datang! Tekan tombol <strong>Mulai Panggilan Test</strong> di bawah untuk berbicara secara langsung dengan AI Voice Assistant.',
      callerLabel: 'Nomor Telepon Pemanggil:',
      connecting: 'Menghubungkan...',
      startCall: 'Mulai Panggilan Test',
      hangupCall: 'Akhiri Panggilan',
      micError: '⚠️ Akses mikrofon ditolak atau tidak tersedia.',
      callEnded: '🔴 Panggilan telah berakhir.',
      connectingGateway: '⌛ Menghubungkan ke server AI Voice Gateway...',
      ready: 'Tersambung - AI Siap',
      liveActive: 'Live Suara Aktif'
    },
    en: {
      defaultTitle: 'Ask AI Voice',
      defaultSubtitle: '24/7 AI Voice Service',
      welcome: '👋 Welcome! Press the <strong>Start Test Call</strong> button below to talk directly with the AI Voice Assistant.',
      callerLabel: 'Caller Phone Number:',
      connecting: 'Connecting...',
      startCall: 'Start Test Call',
      hangupCall: 'End Call',
      micError: '⚠️ Microphone access denied or unavailable.',
      callEnded: '🔴 Call has ended.',
      connectingGateway: '⌛ Connecting to AI Voice Gateway...',
      ready: 'Connected - AI Ready',
      liveActive: 'Live Voice Stream Active'
    }
  };

  var dictionary = i18n[langMode] || i18n.id;

  var title = (currentScript && currentScript.getAttribute('data-title')) || globalConfig.title || dictionary.defaultTitle;
  var subtitle = (currentScript && currentScript.getAttribute('data-subtitle')) || globalConfig.subtitle || dictionary.defaultSubtitle;
  var defaultCallerNumber = (currentScript && currentScript.getAttribute('data-caller-number')) || globalConfig.callerNumber || '+62 812-3456-7890';

  // Effective Theme Calculation
  function getIsDarkTheme() {
    if (themeMode === 'light') return false;
    if (themeMode === 'dark') return true;
    if (themeMode === 'system') {
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return true;
  }

  var isDark = getIsDarkTheme();

  // Determine server host & WebSocket URL
  var scriptUrl = currentScript ? currentScript.src : window.location.href;
  var serverHost = window.location.host;
  var isHttps = window.location.protocol === 'https:';

  try {
    if (scriptUrl && scriptUrl.indexOf('http') === 0) {
      var parsed = new URL(scriptUrl);
      serverHost = parsed.host;
      isHttps = parsed.protocol === 'https:';
    }
  } catch (e) {}

  var wsProtocol = isHttps ? 'wss:' : 'ws:';
  var wsBaseUrl = wsProtocol + '//' + serverHost + '/api/ws';

  // State Variables
  var isOpen = false;
  var ws = null;
  var audioContext = null;
  var mediaStream = null;
  var scriptProcessor = null;
  var startTime = null;
  var timerInterval = null;
  var nextPlaybackTime = 0;
  var activeAudioSources = [];

  // Theme Styles variables
  var modalBg = isDark ? '#0f172a' : '#ffffff';
  var modalText = isDark ? '#f8fafc' : '#0f172a';
  var modalBorder = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
  var headerBg = isDark ? '#1e293b' : '#f8fafc';
  var headerBorder = isDark ? '#334155' : '#e2e8f0';
  var subtitleColor = isDark ? '#94a3b8' : '#64748b';
  var welcomeBg = isDark ? '#1e293b' : '#f1f5f9';
  var welcomeText = isDark ? '#cbd5e1' : '#334155';
  var welcomeBorder = isDark ? '#334155' : '#cbd5e1';
  var inputBg = isDark ? '#0f172a' : '#f8fafc';
  var inputBorder = isDark ? '#334155' : '#cbd5e1';
  var inputText = isDark ? '#ffffff' : '#0f172a';
  var msgAiBg = isDark ? '#334155' : '#e2e8f0';
  var msgAiText = isDark ? '#f1f5f9' : '#0f172a';

  // Inject CSS Styles
  var styleEl = document.createElement('style');
  styleEl.id = 'aiv-widget-styles';
  styleEl.innerHTML = `
    .aiv-widget-btn {
      position: fixed;
      z-index: 9999999;
      bottom: 24px;
      ${position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'}
      background-color: ${themeColor};
      color: #ffffff;
      border: none;
      border-radius: 50px;
      padding: 12px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.25s ease;
      outline: none;
    }
    .aiv-widget-btn:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.4);
    }
    .aiv-widget-btn .aiv-pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50px;
      background-color: ${themeColor};
      opacity: 0.4;
      z-index: -1;
      animation: aiv-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    @keyframes aiv-ping {
      75%, 100% { transform: scale(1.2); opacity: 0; }
    }
    .aiv-modal {
      position: fixed;
      z-index: 9999999;
      bottom: 84px;
      ${position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'}
      width: 360px;
      max-width: calc(100vw - 32px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: ${modalBg};
      color: ${modalText};
      border-radius: 16px;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.4), 0 0 0 1px ${modalBorder};
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .aiv-modal.aiv-open {
      display: flex;
      animation: aiv-slide-up 0.3s ease;
    }
    @keyframes aiv-slide-up {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .aiv-header {
      padding: 16px;
      background: ${headerBg};
      border-bottom: 1px solid ${headerBorder};
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .aiv-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .aiv-footer {
      padding: 16px;
      background: ${headerBg};
      border-top: 1px solid ${headerBorder};
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .aiv-btn-call {
      width: 100%;
      padding: 12px;
      background: ${themeColor};
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .aiv-btn-call:hover { opacity: 0.9; }
    .aiv-btn-hangup {
      width: 100%;
      padding: 12px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .aiv-btn-hangup:hover { background: #dc2626; }
    .aiv-transcript-msg {
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 13px;
      line-height: 1.4;
      max-width: 85%;
      word-break: break-word;
    }
    .aiv-msg-ai {
      background: ${msgAiBg};
      color: ${msgAiText};
      align-self: flex-start;
      border-bottom-left-radius: 2px;
    }
    .aiv-msg-user {
      background: ${themeColor};
      color: #ffffff;
      align-self: flex-end;
      border-bottom-right-radius: 2px;
    }
  `;

  // Create Container DOM
  var container = document.createElement('div');
  container.id = 'aiv-widget-container';
  container.innerHTML = `
    <button class="aiv-widget-btn" id="aiv-trigger-btn" type="button">
      <span class="aiv-pulse-ring"></span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
      </svg>
      <span>${title}</span>
    </button>

    <div class="aiv-modal" id="aiv-modal-dialog">
      <div class="aiv-header">
        <div>
          <div style="font-weight: 700; font-size: 15px; color: ${modalText};">${title}</div>
          <div style="font-size: 11px; color: ${subtitleColor}; margin-top: 2px;">${subtitle}</div>
        </div>
        <button id="aiv-close-btn" type="button" style="background:none; border:none; color:${subtitleColor}; cursor:pointer; padding:4px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="aiv-body" id="aiv-transcript-list">
        <div style="background: ${welcomeBg}; padding: 12px; border-radius: 10px; font-size: 12px; color: ${welcomeText}; border: 1px solid ${welcomeBorder};">
          ${dictionary.welcome}
        </div>
      </div>

      <div class="aiv-footer" id="aiv-controls-footer">
        <div id="aiv-input-group">
          <label style="font-size: 11px; color: ${subtitleColor}; display: block; margin-bottom: 4px;">${dictionary.callerLabel}</label>
          <input type="text" id="aiv-caller-input" value="${defaultCallerNumber}" style="width: 100%; box-sizing: border-box; padding: 8px 12px; background: ${inputBg}; border: 1px solid ${inputBorder}; border-radius: 8px; color: ${inputText}; font-size: 13px; font-family: monospace;" />
        </div>

        <div id="aiv-status-bar" style="display: none; align-items: center; justify-content: space-between; font-size: 12px; color: #38bdf8; font-family: monospace;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;" class="aiv-ping-dot"></span>
            <span id="aiv-status-text">${dictionary.connecting}</span>
          </div>
          <span id="aiv-timer" style="font-weight: bold;">00:00</span>
        </div>

        <button class="aiv-btn-call" id="aiv-start-call-btn" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          <span>${dictionary.startCall}</span>
        </button>

        <button class="aiv-btn-hangup" id="aiv-hangup-btn" type="button" style="display: none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="22" y1="2" x2="2" y2="22"></line></svg>
          <span>${dictionary.hangupCall}</span>
        </button>
      </div>
    </div>
  `;

  // Safe DOM Mounting Function
  function mountWidgetDOM() {
    if (document.getElementById('aiv-widget-container')) return;
    
    if (!document.getElementById('aiv-widget-styles')) {
      document.head.appendChild(styleEl);
    }
    document.body.appendChild(container);

    // Attach DOM Event Listeners
    var triggerBtn = document.getElementById('aiv-trigger-btn');
    var modalDialog = document.getElementById('aiv-modal-dialog');
    var closeBtn = document.getElementById('aiv-close-btn');
    var startCallBtn = document.getElementById('aiv-start-call-btn');
    var hangupBtn = document.getElementById('aiv-hangup-btn');
    var callerInput = document.getElementById('aiv-caller-input');

    if (triggerBtn) {
      triggerBtn.addEventListener('click', function () {
        isOpen = !isOpen;
        if (isOpen) {
          modalDialog.classList.add('aiv-open');
        } else {
          modalDialog.classList.remove('aiv-open');
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        isOpen = false;
        modalDialog.classList.remove('aiv-open');
      });
    }

    if (startCallBtn) {
      startCallBtn.addEventListener('click', function () {
        var callerNum = (callerInput && callerInput.value) || defaultCallerNumber;
        initiateCall(callerNum);
      });
    }

    if (hangupBtn) {
      hangupBtn.addEventListener('click', function () {
        stopCall();
      });
    }
  }

  // Ensure DOM is ready before mounting
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidgetDOM);
  } else {
    mountWidgetDOM();
  }

  // Append Transcript Message
  function appendTranscript(role, text) {
    var transcriptList = document.getElementById('aiv-transcript-list');
    if (!transcriptList) return;
    var msgDiv = document.createElement('div');
    msgDiv.className = 'aiv-transcript-msg ' + (role === 'ai' ? 'aiv-msg-ai' : 'aiv-msg-user');
    msgDiv.innerText = text;
    transcriptList.appendChild(msgDiv);
    transcriptList.scrollTop = transcriptList.scrollHeight;
  }

  // Audio Playback Queue
  function playAudioChunk(base64Pcm) {
    if (!audioContext) return;
    try {
      var binaryStr = window.atob(base64Pcm);
      var len = binaryStr.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      var pcm16 = new Int16Array(bytes.buffer);
      var sampleRate = 24000;
      var audioBuffer = audioContext.createBuffer(1, pcm16.length, sampleRate);
      var channelData = audioBuffer.getChannelData(0);

      for (var j = 0; j < pcm16.length; j++) {
        channelData[j] = pcm16[j] / 32768.0;
      }

      var source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      var currentTime = audioContext.currentTime;
      if (nextPlaybackTime < currentTime) {
        nextPlaybackTime = currentTime;
      }

      source.start(nextPlaybackTime);
      nextPlaybackTime += audioBuffer.duration;
      activeAudioSources.push(source);
    } catch (e) {
      console.error('Playback error:', e);
    }
  }

  function stopAllAudioPlayback() {
    activeAudioSources.forEach(function (src) {
      try { src.stop(); } catch (e) {}
    });
    activeAudioSources = [];
    if (audioContext) nextPlaybackTime = audioContext.currentTime;
  }

  // Start Call Function
  function initiateCall(callerNum) {
    var inputGroup = document.getElementById('aiv-input-group');
    var startCallBtn = document.getElementById('aiv-start-call-btn');
    var statusBar = document.getElementById('aiv-status-bar');
    var hangupBtn = document.getElementById('aiv-hangup-btn');
    var statusText = document.getElementById('aiv-status-text');
    var timerEl = document.getElementById('aiv-timer');

    if (inputGroup) inputGroup.style.display = 'none';
    if (startCallBtn) startCallBtn.style.display = 'none';
    if (statusBar) statusBar.style.display = 'flex';
    if (hangupBtn) hangupBtn.style.display = 'flex';
    if (statusText) statusText.innerText = dictionary.connecting;

    appendTranscript('ai', dictionary.connectingGateway);

    // Initialize AudioContext
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx({ sampleRate: 16000 });
    nextPlaybackTime = audioContext.currentTime;

    // Connect WebSocket
    var fullWsUrl = wsBaseUrl + '?tenantId=' + encodeURIComponent(tenantId) + '&agentId=' + encodeURIComponent(agentId) + '&callerNumber=' + encodeURIComponent(callerNum);
    ws = new WebSocket(fullWsUrl);

    ws.onopen = function () {
      if (statusText) statusText.innerText = dictionary.ready;
      startTime = Date.now();
      timerInterval = setInterval(function () {
        var elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
        var m = Math.floor(elapsedSecs / 60).toString().padStart(2, '0');
        var s = (elapsedSecs % 60).toString().padStart(2, '0');
        if (timerEl) timerEl.innerText = m + ':' + s;
      }, 1000);

      // Start Microphone Capture
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } })
          .then(function (stream) {
            mediaStream = stream;
            var source = audioContext.createMediaStreamSource(stream);
            scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

            scriptProcessor.onaudioprocess = function (e) {
              if (!ws || ws.readyState !== WebSocket.OPEN) return;
              var inputData = e.inputBuffer.getChannelData(0);
              
              var pcm16 = new Int16Array(inputData.length);
              for (var i = 0; i < inputData.length; i++) {
                var s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }

              var bytes = new Uint8Array(pcm16.buffer);
              var binary = '';
              for (var j = 0; j < bytes.byteLength; j++) {
                binary += String.fromCharCode(bytes[j]);
              }
              var base64 = window.btoa(binary);

              ws.send(JSON.stringify({ event: 'audio', data: base64 }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);
          })
          .catch(function (err) {
            console.error('Microphone access denied:', err);
            appendTranscript('ai', dictionary.micError);
          });
      }
    };

    ws.onmessage = function (event) {
      try {
        var msg = JSON.parse(event.data);

        if (msg.event === 'connected') {
          if (statusText) statusText.innerText = dictionary.liveActive;
        } else if (msg.event === 'audio' && msg.data) {
          playAudioChunk(msg.data);
        } else if (msg.event === 'ai_transcript' && msg.text) {
          appendTranscript('ai', msg.text);
        } else if (msg.event === 'user_transcript' && msg.text) {
          appendTranscript('user', msg.text);
        } else if (msg.event === 'interrupted') {
          stopAllAudioPlayback();
        }
      } catch (e) {
        console.error('Error handling WebSocket message:', e);
      }
    };

    ws.onclose = function () {
      stopCall();
    };

    ws.onerror = function (err) {
      console.error('WebSocket error:', err);
      stopCall();
    };
  }

  // Stop Call Function
  function stopCall() {
    if (ws) {
      try { ws.send(JSON.stringify({ event: 'hangup' })); } catch (e) {}
      try { ws.close(); } catch (e) {}
      ws = null;
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach(function (track) { track.stop(); });
      mediaStream = null;
    }

    if (scriptProcessor) {
      try { scriptProcessor.disconnect(); } catch (e) {}
      scriptProcessor = null;
    }

    stopAllAudioPlayback();

    if (audioContext) {
      try { audioContext.close(); } catch (e) {}
      audioContext = null;
    }

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    var inputGroup = document.getElementById('aiv-input-group');
    var startCallBtn = document.getElementById('aiv-start-call-btn');
    var statusBar = document.getElementById('aiv-status-bar');
    var hangupBtn = document.getElementById('aiv-hangup-btn');
    var timerEl = document.getElementById('aiv-timer');

    if (inputGroup) inputGroup.style.display = 'block';
    if (startCallBtn) startCallBtn.style.display = 'flex';
    if (statusBar) statusBar.style.display = 'none';
    if (hangupBtn) hangupBtn.style.display = 'none';
    if (timerEl) timerEl.innerText = '00:00';

    appendTranscript('ai', dictionary.callEnded);
  }

  // Global Instance API
  window.AiVoiceWidgetInstance = {
    open: function () {
      isOpen = true;
      var modalDialog = document.getElementById('aiv-modal-dialog');
      if (modalDialog) modalDialog.classList.add('aiv-open');
    },
    close: function () {
      isOpen = false;
      var modalDialog = document.getElementById('aiv-modal-dialog');
      if (modalDialog) modalDialog.classList.remove('aiv-open');
    },
    remove: function () {
      var el = document.getElementById('aiv-widget-container');
      if (el) el.remove();
      var st = document.getElementById('aiv-widget-styles');
      if (st) st.remove();
      window.__AiVoiceWidgetLoaded = false;
      window.__AiVoiceWidgetInstance = null;
    }
  };

})();
