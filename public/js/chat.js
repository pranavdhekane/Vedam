const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const chatForm = document.getElementById("chat-form");
const sendBtn = document.getElementById("sendBtn");
const subjectId = document.body.dataset.subjectId;

let messages = JSON.parse(localStorage.getItem("AskMyNotes_chat_" + subjectId)) || [];
let isProcessing = false;

// ========== VOICE VARIABLES ==========
let isRecording = false;
let recognition = null;
let currentUtterance = null;

// Initialize Speech Recognition (browser API - NO BACKEND NEEDED!)
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        showToast("Heard: " + transcript, "info");
        // Auto-send after recognition
        setTimeout(() => {
            if (chatInput.value.trim()) {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }, 500);
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showToast("Could not hear clearly. Try again.", "error");
        stopVoiceRecording();
    };
    
    recognition.onend = () => {
        stopVoiceRecording();
    };
}

function showInfoModal() {
    document.getElementById("info-modal").classList.remove("hidden");
}

function hideInfoModal() {
    document.getElementById("info-modal").classList.add("hidden");
}

function renderMessages() {
    chatBox.innerHTML = "";

    if (messages.length === 0) {
        chatBox.innerHTML = `
            <div class='flex justify-center items-center h-[70vh] text-center'>
                <div>
                    <p class='font-semibold text-3xl text-dorado-800 mb-2'>
                        Ask your notes
                    </p>
                    <p class='text-dorado-500'>
                        Subject-scoped grounded answers
                    </p>
                </div>
            </div>
        `;
        return;
    }

    messages.forEach((msg) => {
        const isUser = msg.role === "user";
        const formattedText = msg.text.replace(/\n/g, '<br>');
        
        chatBox.innerHTML += `
            <div class="max-w-[85%] w-fit mb-4 ${isUser ? 'ml-auto' : 'mr-auto'}">
                <div class="py-3 px-4 rounded-2xl break-words shadow-sm
                    ${isUser
                        ? 'bg-dorado-200 text-dorado-900 rounded-br-md'
                        : 'bg-white border border-dorado-200 text-dorado-800 rounded-bl-md'}">
                    ${formattedText}
                </div>
            </div>
        `;
    });

    chatBox.innerHTML += "<div class='h-20'></div>";
    setTimeout(() => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    }, 50);
}

function addMessage(role, text) {
    messages.push({ role, text });
    localStorage.setItem("AskMyNotes_chat_" + subjectId, JSON.stringify(messages));
    renderMessages();
}

function clearChat() {
    if (confirm("Clear chat history?")) {
        messages = [];
        localStorage.removeItem("AskMyNotes_chat_" + subjectId);
        renderMessages();
    }
}

// ========== VOICE FUNCTIONS (Browser APIs - Simple!) ==========
function startVoiceRecording() {
    if (!recognition) {
        showToast("Voice input not supported in this browser. Use Chrome.", "error");
        return;
    }
    
    if (isRecording) {
        stopVoiceRecording();
        return;
    }
    
    try {
        recognition.start();
        isRecording = true;
        
        const voiceBtn = document.getElementById("voiceBtn");
        voiceBtn.innerText = "⏹️";
        voiceBtn.classList.add("bg-red-500");
        
        showToast("Listening... Speak now", "info");
    } catch (error) {
        console.error('Error starting recognition:', error);
        showToast("Could not start voice input", "error");
    }
}

function stopVoiceRecording() {
    if (recognition && isRecording) {
        try {
            recognition.stop();
        } catch (e) {
            console.error('Error stopping recognition:', e);
        }
    }
    
    isRecording = false;
    const voiceBtn = document.getElementById("voiceBtn");
    voiceBtn.innerText = "🎤";
    voiceBtn.classList.remove("bg-red-500");
}

function speakText(text) {
    // Stop any current speech
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    
    // Clean text for speech (remove formatting, citations, etc.)
    const cleanText = text
        .replace(/\n/g, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/\[Source \d+\]/g, '')
        .replace(/Confidence: \w+/g, '')
        .replace(/Sources:/g, '')
        .replace(/Evidence:/g, '');
    
    // Create speech utterance
    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;
    currentUtterance.lang = 'en-US';
    
    currentUtterance.onend = () => {
        currentUtterance = null;
    };
    
    currentUtterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        currentUtterance = null;
    };
    
    // Speak!
    window.speechSynthesis.speak(currentUtterance);
}

function stopSpeaking() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        currentUtterance = null;
        showToast("Speech stopped", "info");
    }
}

// ========== CHAT FUNCTIONS ==========
chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 128) + "px";
});

chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    const userMsg = chatInput.value.trim();
    if (!userMsg) return;

    isProcessing = true;
    addMessage("user", userMsg);
    chatInput.value = "";
    chatInput.style.height = "auto";
    sendBtn.disabled = true;
    sendBtn.innerText = "…";
    addMessage("assistant", "Thinking...");

    try {
        const res = await axios.post("/api/chat/message", {
            chatId: subjectId,
            message: userMsg
        });
        
        const assistantMsg = res.data.message || "Response received";
        
        messages[messages.length - 1] = {
            role: "assistant",
            text: assistantMsg
        };
        
        // ✅ AUTOMATICALLY SPEAK THE ANSWER!
        speakText(assistantMsg);
        
    } catch (error) {
        messages[messages.length - 1] = {
            role: "assistant",
            text: "Error processing your question"
        };
    } finally {
        localStorage.setItem("AskMyNotes_chat_" + subjectId, JSON.stringify(messages));
        renderMessages();
        sendBtn.disabled = false;
        sendBtn.innerText = "➤";
        isProcessing = false;
        chatInput.focus();
    }
});

renderMessages();

// ========== DOCUMENT SIDEBAR ==========
const docSidebar = document.getElementById("doc-sidebar");
const docOverlay = document.getElementById("doc-overlay");
const docList = document.getElementById("doc-list");
const docUpload = document.getElementById("doc-upload");

function openDocSidebar() {
    docOverlay.classList.remove("hidden");
    docSidebar.classList.remove("translate-x-full");
    loadDocuments();
}

function closeDocSidebar() {
    docOverlay.classList.add("hidden");
    docSidebar.classList.add("translate-x-full");
}

async function loadDocuments() {
    try {
        const res = await axios.get(`/documents/list/${subjectId}`);
        const files = res.data.files || [];

        docList.innerHTML = "";

        if (files.length === 0) {
            docList.innerHTML = `
                <p class="text-dorado-400 text-sm">
                    No documents uploaded for this subject.
                </p>
            `;
            return;
        }

        files.forEach(file => {
            const item = document.createElement("div");
            item.className = "p-3 border border-dorado-200 rounded-md bg-dorado-50";
            
            const uploadDate = file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Unknown';
            
            item.innerHTML = `
                <div class="flex justify-between items-start gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="truncate font-medium text-dorado-800">${file.name}</div>
                        <div class="text-xs text-dorado-500 mt-1">Uploaded: ${uploadDate}</div>
                    </div>
                    <button onclick="deleteDocument('${file.filename || file.name}')" 
                            class="flex-shrink-0 text-dorado-400 hover:text-red-600 transition">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                            </path>
                        </svg>
                    </button>
                </div>
            `;
            docList.appendChild(item);
        });

    } catch (err) {
        showToast("Failed to load documents", "error");
    }
}

async function deleteDocument(filename) {
    if (!confirm('Are you sure you want to delete this document?')) {
        return;
    }

    try {
        await axios.delete(`/documents/delete/${subjectId}/${filename}`);
        showToast("Document deleted", "success");
        loadDocuments();
    } catch (err) {
        showToast("Failed to delete document", "error");
    }
}

docUpload.addEventListener("change", async () => {
    const files = docUpload.files;
    if (!files.length) return;

    const formData = new FormData();
    for (let file of files) {
        formData.append("documents", file);
    }

    try {
        showToast("Uploading documents...", "info");
        await axios.post(`/documents/upload/${subjectId}`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        showToast("Documents uploaded successfully", "success");
        loadDocuments();
        docUpload.value = "";
    } catch (err) {
        showToast("Upload failed", "error");
    }
});

function showQuestionPanel() {
    document.getElementById("question-panel").classList.remove("hidden");
}

function hideQuestionPanel() {
    document.getElementById("question-panel").classList.add("hidden");
}

function generateMCQs() {
    showToast("MCQ generation will be implemented soon", "info");
}

function generateShortAnswer() {
    showToast("Short answer generation will be implemented soon", "info");
}
