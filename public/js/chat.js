const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const chatForm = document.getElementById("chat-form");
const sendBtn = document.getElementById("sendBtn");

let messages = JSON.parse(localStorage.getItem("AskMyNotes_chat")) || [];
let isProcessing = false;

/* ---------------- Modal ---------------- */

function showInfoModal() {
    document.getElementById("info-modal").classList.remove("hidden");
}

function hideInfoModal() {
    document.getElementById("info-modal").classList.add("hidden");
}

/* ---------------- Render Messages ---------------- */

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

        chatBox.innerHTML += `
            <div class="max-w-[85%] w-fit mb-4 ${isUser ? 'ml-auto' : 'mr-auto'}">
                <div class="py-3 px-4 rounded-2xl break-words shadow-sm
                    ${isUser
                        ? 'bg-dorado-200 text-dorado-900 rounded-br-md'
                        : 'bg-white border border-dorado-200 text-dorado-800 rounded-bl-md'}">
                    ${msg.text}
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

/* ---------------- Add Message ---------------- */

function addMessage(role, text) {
    messages.push({ role, text });
    localStorage.setItem("AskMyNotes_chat", JSON.stringify(messages));
    renderMessages();
}

/* ---------------- Clear Chat ---------------- */

function clearChat() {
    if (confirm("Clear chat history?")) {
        messages = [];
        localStorage.removeItem("AskMyNotes_chat");
        renderMessages();
    }
}

/* ---------------- Auto Resize ---------------- */

chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 128) + "px";
});

/* ---------------- Submit ---------------- */

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
        const res = await axios.post("/chat/chat", {
            userMsg,
            messages
        });

        messages[messages.length - 1] = {
            role: "assistant",
            text: res.data.message
        };

    } catch (error) {
        messages[messages.length - 1] = {
            role: "assistant",
            text: "Not found in your notes."
        };
    } finally {
        localStorage.setItem("AskMyNotes_chat", JSON.stringify(messages));
        renderMessages();
        sendBtn.disabled = false;
        sendBtn.innerText = "➤";
        isProcessing = false;
        chatInput.focus();
    }
});

/* ---------------- Init ---------------- */

renderMessages();

/* ---------------- Document Sidebar ---------------- */

const docSidebar = document.getElementById("doc-sidebar");
const docOverlay = document.getElementById("doc-overlay");
const docList = document.getElementById("doc-list");
const docUpload = document.getElementById("doc-upload");

function openDocSidebar() {
    docOverlay.classList.remove("hidden");
    docSidebar.classList.remove("translate-x-full");
}

function closeDocSidebar() {
    docOverlay.classList.add("hidden");
    docSidebar.classList.add("translate-x-full");
}

/* ---------------- Load Documents ---------------- */

async function loadDocuments() {
    try {
        const res = await axios.get("/documents/current-subject");
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

            item.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="truncate">${file.name}</span>
                </div>
            `;

            docList.appendChild(item);
        });

    } catch (err) {
        showToast("Failed to load documents", "error");
    }
}

/* ---------------- Upload Documents ---------------- */

docUpload.addEventListener("change", async () => {
    const files = docUpload.files;
    if (!files.length) return;

    const formData = new FormData();

    for (let file of files) {
        formData.append("documents", file);
    }

    try {
        await axios.post("/documents/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });

        showToast("Documents uploaded", "success");
        loadDocuments();

    } catch (err) {
        showToast("Upload failed", "error");
    }
});

/* Load docs when sidebar opens */
document.addEventListener("DOMContentLoaded", () => {
    loadDocuments();
});