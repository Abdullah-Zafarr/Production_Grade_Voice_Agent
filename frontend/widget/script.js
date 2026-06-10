document.addEventListener('DOMContentLoaded', () => {
    // --- INITIALIZATION ---
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
    const API_URL = isLocal ? 'http://localhost:8000' : 'https://soul-imaging-voice-agent.fly.dev';

    let room = null;
    let localAudioTrack = null;
    let isConnected = false;
    let isMuted = false;
    let callStartTime = null;
    let timerInterval = null;

    // --- DOM ELEMENTS ---
    const connectionStatus = document.getElementById('connection-status');
    const statusLabel = connectionStatus ? connectionStatus.querySelector('.status-label') : null;
    const callTimer = document.getElementById('call-timer');
    const volumeBar = document.getElementById('volume-bar');
    const transcriptFeed = document.getElementById('transcript-feed');
    const orbStatusText = document.getElementById('orb-status-text');
    const agentDisplayName = document.getElementById('agent-display-name');

    const actionBtn = document.getElementById('action-btn');
    const muteBtn = document.getElementById('mute-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Fetch Initial Config
    fetchAgentIdentity();

    // --- EVENT LISTENERS ---
    let longPressTimer = null;
    let longPressTriggered = false;

    if (actionBtn) {
        actionBtn.addEventListener('click', (e) => {
            if (longPressTriggered) {
                longPressTriggered = false;
                return; // consumed by long-press
            }
            if (!isConnected) {
                connectToAgent();
            }
            // When connected, click does nothing — must long-press to exit
        });

        actionBtn.addEventListener('pointerdown', (e) => {
            if (!isConnected) return;
            longPressTriggered = false;
            actionBtn.classList.add('long-pressing');
            longPressTimer = setTimeout(() => {
                longPressTriggered = true;
                actionBtn.classList.remove('long-pressing');
                disconnectAgent();
            }, 1500);
        });

        actionBtn.addEventListener('pointerup', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            actionBtn.classList.remove('long-pressing');
        });

        actionBtn.addEventListener('pointerleave', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            actionBtn.classList.remove('long-pressing');
        });
    }

    if (muteBtn) muteBtn.addEventListener('click', toggleMute);
    if (resetBtn) resetBtn.addEventListener('click', disconnectAgent);

    // --- CORE FUNCTIONS ---

    // Retrieves agent branding from the server
    async function fetchAgentIdentity() {
        try {
            const res = await fetch(`${API_URL}/api/agent/config`);
            const data = await res.json();
            if (data.agent_identity && data.agent_identity.name) {
                if (agentDisplayName) agentDisplayName.textContent = data.agent_identity.name;
            }
        } catch (e) {
            console.warn("Could not fetch agent identity");
        }
    }

    // Manages WebRTC connection and audio tracks
    async function connectToAgent() {
        try {
            // 0. Safety Check: Modern browsers block mic on non-localhost http.
            if (!window.isSecureContext && window.location.protocol !== 'https:') {
                const warnMsg = "Security Block: This site is not secure (HTTPS). Your browser will block the microphone unless you use 'localhost' or an HTTPS tunnel.";
                addTranscriptItem(warnMsg, "error");
                alert(warnMsg);
                // We keep going but user is warned.
            }

            updateUIState('connecting');

            // 1. Start Mic Request in Parallel with Token Fetch TO REDUCE LATENCY
            const micPromise = LivekitClient.createLocalAudioTrack()
                .then(track => {
                    localAudioTrack = track;
                    return track;
                })
                .catch(err => {
                    console.error("Initial Mic request failed:", err);
                    return null;
                });

            // 2. Get token
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const tokenPromise = fetch(`${API_URL}/api/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identity: `user_${Math.floor(Math.random() * 1000)}`,
                    room: `call_${Date.now()}`
                }),
                signal: controller.signal
            }).then(res => {
                if (!res.ok) throw new Error("Could not fetch token from server");
                return res.json();
            });

            // Wait for both
            const [micTrack, { token, url }] = await Promise.all([micPromise, tokenPromise]);
            clearTimeout(timeoutId);

            // 3. Connect to Room
            room = new LivekitClient.Room({
                adaptiveStream: true,
                dynacast: true,
            });

            setupRoomListeners();
            await room.connect(url, token);

            // 4. Update UI
            updateUIState('connected');
            startTimer();
            addTranscriptItem("Call securely connected. Soul Imaging Agent is online.", "system");

            // 5. Publish Mic if available
            if (localAudioTrack) {
                await room.localParticipant.publishTrack(localAudioTrack);
            } else {
                 addTranscriptItem("Warning: No microphone found. Sarah won't be able to hear you.", "error");
            }

        } catch (e) {
            console.error("Connection process failed:", e);
            if (room) {
                room.disconnect();
                room = null;
            }
            if (localAudioTrack) {
                localAudioTrack.stop();
                localAudioTrack = null;
            }
            updateUIState('error');
            addTranscriptItem(`Connection failed: ${e.message || 'Check microphone permissions'}`, "error");
        }
    }


    function disconnectAgent() {
        if (room) room.disconnect();
        room = null;
        if (localAudioTrack) {
            localAudioTrack.stop();
            localAudioTrack = null;
        }
        stopTimer();
        updateUIState('idle');
        addTranscriptItem("Session ended by user.", "system");
    }

    function setupRoomListeners() {
        if (!room) return;

        room
            .on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
                if (track.kind === 'audio') track.attach();
            })
            .on(LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers) => {
                const isAgentSpeaking = speakers.some(s => s.identity !== room.localParticipant.identity);
                const isUserSpeaking = speakers.some(s => s.identity === room.localParticipant.identity);

                if (isAgentSpeaking) {
                    setOrbState('speaking');
                    if (orbStatusText) orbStatusText.textContent = "Agent Speaking";
                } else if (isUserSpeaking) {
                    setOrbState('listening');
                    if (orbStatusText) orbStatusText.textContent = "Listening...";
                } else {
                    setOrbState('idle');
                    if (orbStatusText) orbStatusText.textContent = "Connected";
                }
            })
            .on(LivekitClient.RoomEvent.DataReceived, (payload) => {
                try {
                    const text = new TextDecoder().decode(payload);
                    const data = JSON.parse(text);
                    if (data.type === 'transcript') {
                        addTranscriptItem(data.text, data.sender === 'bot' ? 'bot' : 'user');
                    } else if (data.type === 'latency') {
                        const latencyBadge = document.getElementById('latency-badge');
                        const latencyValue = document.getElementById('latency-value');
                        if (latencyBadge) latencyBadge.style.display = 'flex';
                        if (latencyValue) latencyValue.textContent = `${data.ms}ms`;
                    }
                } catch (e) { }
            })
            .on(LivekitClient.RoomEvent.TranscriptionReceived, (segments, participant) => {
                for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i];
                    if (segment.final) {
                        const sender = (participant === room.localParticipant) ? 'user' : 'bot';
                        addTranscriptItem(segment.text, sender);
                    }
                }
            })
            .on(LivekitClient.RoomEvent.Disconnected, () => {
                disconnectAgent();
            })
            .on(LivekitClient.RoomEvent.LocalTrackPublished, () => {
                const intervalId = setInterval(() => {
                    if (room && room.localParticipant && volumeBar) {
                        const level = room.localParticipant.audioLevel * 100;
                        volumeBar.style.width = `${Math.min(level * 2, 100)}%`;
                    } else {
                        clearInterval(intervalId);
                    }
                }, 100);
            });
    }

    function toggleMute() {
        if (!localAudioTrack) return;
        isMuted = !isMuted;

        const icon = muteBtn ? muteBtn.querySelector('i, svg') : null;

        if (isMuted) {
            localAudioTrack.mute();
            if (muteBtn) muteBtn.classList.add('active');
            if (icon) icon.setAttribute('data-lucide', 'mic-off');
        } else {
            localAudioTrack.unmute();
            if (muteBtn) muteBtn.classList.remove('active');
            if (icon) icon.setAttribute('data-lucide', 'mic');
        }
        if (window.lucide) window.lucide.createIcons();
    }

    // --- UI HELPERS ---

    function updateUIState(state) {
        isConnected = (state === 'connected');

        const actionIcon = actionBtn ? actionBtn.querySelector('i, svg') : null;
        const actionLabel = document.getElementById('action-label');

        switch (state) {
            case 'idle':
                if (connectionStatus) connectionStatus.classList.remove('online');
                if (statusLabel) statusLabel.textContent = "Offline";
                if (orbStatusText) orbStatusText.textContent = "Ready to connect";
                if (actionBtn) actionBtn.classList.remove('active');
                if (actionLabel) actionLabel.textContent = "Connect";
                setOrbState('idle');
                if (volumeBar) volumeBar.style.width = '0%';
                const latencyBadge = document.getElementById('latency-badge');
                if (latencyBadge) latencyBadge.style.display = 'none';
                break;
            case 'connecting':
                if (statusLabel) statusLabel.textContent = "Connecting...";
                if (orbStatusText) orbStatusText.textContent = "Establishing Secure Link";
                if (actionLabel) actionLabel.textContent = "Linking...";
                setOrbState('thinking');
                break;
            case 'connected':
                if (connectionStatus) connectionStatus.classList.add('online');
                if (statusLabel) statusLabel.textContent = "Online";
                if (orbStatusText) orbStatusText.textContent = "Connected";
                if (actionBtn) actionBtn.classList.add('active');
                if (actionLabel) actionLabel.textContent = "Hold to End";
                setOrbState('idle');
                break;
            case 'error':
                if (statusLabel) statusLabel.textContent = "Error";
                if (orbStatusText) orbStatusText.textContent = "Connection Refused";
                if (actionLabel) actionLabel.textContent = "Retry";
                setOrbState('idle');
                break;
        }
        if (window.lucide) window.lucide.createIcons();
    }

    function startTimer() {
        callStartTime = Date.now();
        timerInterval = setInterval(() => {
            const delta = Math.floor((Date.now() - callStartTime) / 1000);
            const m = Math.floor(delta / 60).toString().padStart(2, '0');
            const s = (delta % 60).toString().padStart(2, '0');
            if (callTimer) callTimer.textContent = `${m}:${s}`;
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
        if (callTimer) callTimer.textContent = "00:00";
    }

    function addTranscriptItem(text, type) {
        if (!transcriptFeed) return;

        if (transcriptFeed.querySelector('.transcript-placeholder')) {
            transcriptFeed.innerHTML = '';
        }

        const div = document.createElement('div');
        div.className = `transcript-item ${type}`;

        // Use type for data-attribute to drive the CSS labels
        let sender = "";
        if (type === 'user') sender = "You";
        else if (type === 'bot') sender = "Sarah (AI)";
        else if (type === 'system') sender = "System";

        div.setAttribute('data-sender', sender);
        div.textContent = text;

        transcriptFeed.appendChild(div);
        transcriptFeed.scrollTop = transcriptFeed.scrollHeight;
    }

    function setOrbState(state) {
        if (window.setSoulbotState) window.setSoulbotState(state);
    }
});
