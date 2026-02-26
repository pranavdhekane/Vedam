const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const chatForm = document.getElementById("chat-form");
const sendBtn = document.getElementById("sendBtn");
const subjectId = document.body.dataset.subjectId;

let messages = JSON.parse(localStorage.getItem("AskMyNotes_chat_" + subjectId)) || [];
let isProcessing = false;

// -------------------- Modals --------------------
function showInfoModal() {
    document.getElementById("info-modal").classList.remove("hidden");
}
function hideInfoModal() {
    document.getElementById("info-modal").classList.add("hidden");
}
function showQuestionPanel() {
    document.getElementById("question-panel").classList.remove("hidden");
}
function hideQuestionPanel() {
    document.getElementById("question-panel").classList.add("hidden");
}

// -------------------- Text Sanitization --------------------
function sanitizeText(text) {
    if (!text) return '';
    // remove markdown/asterisks/etc.
    return text.replace(/[*_`~]/g, '');
}

// -------------------- TTS --------------------
function speakAnswer(text) {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
}

// -------------------- Chat Rendering --------------------
function renderMessages() {
    chatBox.innerHTML = "";

    if (messages.length === 0) {
        chatBox.innerHTML = `
            <div class='flex justify-center items-center h-[70vh] text-center'>
                <div>
                    <p class='font-semibold text-3xl text-dorado-800 mb-2'>Ask your notes</p>
                    <p class='text-dorado-500'>Subject-scoped grounded answers</p>
                </div>
            </div>
        `;
        return;
    }

    messages.forEach((msg, idx) => {
        const isUser = msg.role === "user";
        const textToShow = isUser ? msg.text : (msg.answer || 'No response');
        const confidence = msg.confidence || 'Unknown';
        const citationsHtml = (msg.citations || []).map((c, i) => `<li>${i+1}. ${c.filename} (Section ${c.chunkIndex})</li>`).join('');

        if (isUser) {
            chatBox.innerHTML += `
                <div class="max-w-[85%] w-fit mb-4 ml-auto">
                    <div class="py-3 px-4 rounded-2xl break-words shadow-sm bg-dorado-200 text-dorado-900 rounded-br-md">
                        ${sanitizeText(textToShow).replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
        } else {
            chatBox.innerHTML += `
                <div class="max-w-[85%] w-fit mb-4 mr-auto">
                    <div class="py-3 px-4 rounded-2xl break-words shadow-sm bg-white border border-dorado-200 text-dorado-800 rounded-bl-md">
                        ${sanitizeText(textToShow).replace(/\n/g, '<br>')}

                        <div class="mt-2 text-xs text-dorado-500 cursor-pointer" onclick="toggleSources(${idx})">
                            Show Confidence & Sources ▼
                        </div>
                        <div id="sources-${idx}" class="hidden mt-1 text-xs text-dorado-600 border-t border-dorado-200 pt-1">
                            <p><strong>Confidence:</strong> ${confidence}</p>
                            <ul class="list-disc pl-4">${citationsHtml}</ul>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    chatBox.innerHTML += "<div class='h-20'></div>";
    setTimeout(() => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    }, 50);
}

// -------------------- Add / Clear Messages --------------------
function addMessage(role, content = '', extra = {}) {
    const msg = { role, ...extra };
    if (role === "user") msg.text = content;
    else msg.answer = content;

    messages.push(msg);
    localStorage.setItem("AskMyNotes_chat", JSON.stringify(messages));
    renderMessages();

    // TTS only for assistant
    if (role === "assistant" && msg.answer) speakAnswer(msg.answer);
}

function clearChat() {
    if (confirm("Clear chat history?")) {
        messages = [];
        localStorage.removeItem("AskMyNotes_chat_" + subjectId);
        renderMessages();
    }
}

// -------------------- Chat Input --------------------
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

    // placeholder for assistant
    addMessage("assistant", "Thinking...", { confidence: null, citations: [], evidence: [] });

    try {
        const res = await axios.post("/api/chat/message", {
            chatId: subjectId,
            conversation: messages
        });

        const answerText = sanitizeText(res.data.answer || res.data.message);

        // Replace placeholder with actual structured response
        messages[messages.length - 1] = {
            role: "assistant",
            answer: answerText,
            confidence: res.data.confidence || 'Unknown',
            citations: res.data.citations || [],
            evidence: res.data.evidence || []
        };

        speakAnswer(answerText);

    } catch (error) {
        messages[messages.length - 1] = {
            role: "assistant",
            answer: "Error processing your question",
            confidence: 'Low',
            citations: [],
            evidence: []
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

// -------------------- Sidebar / Documents --------------------
const docSidebar = document.getElementById("doc-sidebar");
const docOverlay = document.getElementById("doc-overlay");
const docList = document.getElementById("doc-list");
const docUpload = document.getElementById("doc-upload");

function openDocSidebar() {
    docOverlay.classList.remove("hidden");
    setTimeout(() => {
        docSidebar.classList.remove("scale-95", "opacity-0");
        docSidebar.classList.add("scale-100", "opacity-100");
    }, 10);
    loadDocuments();
}

function closeDocSidebar() {
    docSidebar.classList.add("scale-95", "opacity-0");
    setTimeout(() => docOverlay.classList.add("hidden"), 200);
}

async function loadDocuments() {
    try {
        const res = await axios.get(`/documents/list/${subjectId}`);
        const files = res.data.files || [];
        docList.innerHTML = "";

        if (files.length === 0) {
            docList.innerHTML = `<p class="text-dorado-400 text-sm">No documents uploaded for this subject.</p>`;
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
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
    if (!confirm('Are you sure you want to delete this document?')) return;
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
    for (let file of files) formData.append("documents", file);
    try {
        showToast("Uploading documents...", "info");
        await axios.post(`/documents/upload/${subjectId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        showToast("Documents uploaded successfully", "success");
        loadDocuments();
        docUpload.value = "";
    } catch (err) {
        showToast("Upload failed", "error");
    }
});

// -------------------- Collapsible Sources --------------------
function toggleSources(idx) {
    const el = document.getElementById(`sources-${idx}`);
    if (!el) return;
    el.classList.toggle('hidden');
}

function hideQuestionPanel() {
    document.getElementById("question-panel").classList.add("hidden");
}

async function generateMCQs() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "Generating...";

    console.log('=== Frontend MCQ Generation ===');
    console.log('Subject ID:', subjectId);

    try {
        console.log('Calling API...');
        const res = await axios.post(`/api/questions/mcq/${subjectId}`);
        
        console.log('Response received:', res);
        console.log('Response status:', res.status);
        console.log('Response data:', res.data);
        console.log('Questions array:', res.data.questions);
        
        if (!res.data.questions) {
            console.error('ERROR: No questions in response!');
            showToast("Invalid response from server", "error");
            return;
        }
        
        displayMCQs(res.data.questions);
        showToast("MCQs generated successfully", "success");
    } catch (err) {
        console.error('=== Frontend MCQ Error ===');
        console.error('Error object:', err);
        console.error('Error response:', err.response);
        console.error('Error message:', err.message);
        
        const errorMsg = err.response?.data?.message || err.message || "Failed to generate MCQs";
        showToast(errorMsg, "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Generate";
    }
}

async function generateShortAnswer() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "Generating...";

    console.log('=== Frontend Short Answer Generation ===');
    console.log('Subject ID:', subjectId);

    try {
        console.log('Calling API...');
        const res = await axios.post(`/api/questions/short/${subjectId}`);
        
        console.log('Response received:', res);
        console.log('Response status:', res.status);
        console.log('Response data:', res.data);
        console.log('Questions array:', res.data.questions);
        
        if (!res.data.questions) {
            console.error('ERROR: No questions in response!');
            showToast("Invalid response from server", "error");
            return;
        }
        
        displayShortAnswers(res.data.questions);
        showToast("Questions generated successfully", "success");
    } catch (err) {
        console.error('=== Frontend Short Answer Error ===');
        console.error('Error object:', err);
        console.error('Error response:', err.response);
        console.error('Error message:', err.message);
        
        const errorMsg = err.response?.data?.message || err.message || "Failed to generate questions";
        showToast(errorMsg, "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Generate";
    }
}

function displayMCQs(questions) {
    console.log('=== Displaying MCQs ===');
    console.log('Number of questions:', questions.length);
    
    const container = document.getElementById("mcq-container");
    container.innerHTML = "";

    questions.forEach((q, idx) => {
        console.log(`Question ${idx + 1}:`, q);
        
        const div = document.createElement("div");
        div.className = "mt-4 p-4 bg-white rounded-md border border-dorado-200 text-sm";
        div.innerHTML = `
            <p class="font-medium text-dorado-800 mb-3">${idx + 1}. ${q.question}</p>
            <div class="ml-4 space-y-1 text-dorado-600">
                ${q.options.map(opt => {
                    const letter = opt.charAt(0);
                    const isCorrect = letter === q.correct;
                    return `<p class="${isCorrect ? 'text-green-600 font-medium' : ''}">${isCorrect ? '✓ ' : ''}${opt}</p>`;
                }).join('')}
            </div>
            <div class="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                <strong>Explanation:</strong> ${q.explanation}
                <br><strong>Citation:</strong> ${q.citation}
            </div>
        `;
        container.appendChild(div);
    });
    
    console.log('MCQs displayed successfully');
}

function displayShortAnswers(questions) {
    console.log('=== Displaying Short Answers ===');
    console.log('Number of questions:', questions.length);
    
    const container = document.getElementById("short-container");
    container.innerHTML = "";

    questions.forEach((q, idx) => {
        console.log(`Question ${idx + 1}:`, q);
        
        const div = document.createElement("div");
        div.className = "mt-4 p-4 bg-white rounded-md border border-dorado-200 text-sm";
        div.innerHTML = `
            <p class="font-medium text-dorado-800 mb-3">${idx + 1}. ${q.question}</p>
            <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                <strong class="text-blue-800">Model Answer:</strong>
                <p class="text-blue-700 mt-1">${q.answer}</p>
                <p class="text-blue-800 mt-2"><strong>Citation:</strong> ${q.citation}</p>
            </div>
        `;
        container.appendChild(div);
    });
    
    console.log('Short answers displayed successfully');
}
