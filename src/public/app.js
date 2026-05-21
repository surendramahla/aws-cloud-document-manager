// Core Frontend State Manager
const state = {
  selectedFile: null,
  uploadMethod: "server", // "server" or "presigned"
  isUploading: false,
  filters: {
    search: "",
    teamId: ""
  }
};

// DOM Node References
const dbDot = document.getElementById("db-dot");
const dbText = document.getElementById("db-text");
const s3Dot = document.getElementById("s3-dot");
const s3Text = document.getElementById("s3-text");
const refreshHealthBtn = document.getElementById("refresh-health-btn");

const uploaderNameInput = document.getElementById("uploader-name-input");
const teamIdInput = document.getElementById("team-id-input");
const methodServerBtn = document.getElementById("method-server");
const methodPresignedBtn = document.getElementById("method-presigned");

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const progressContainer = document.getElementById("progress-container");
const progressFilename = document.getElementById("progress-filename");
const progressPercentage = document.getElementById("progress-percentage");
const progressBarFill = document.getElementById("progress-bar-fill");
const progressStatus = document.getElementById("progress-status");

const searchInput = document.getElementById("search-input");
const teamFilter = document.getElementById("team-filter");
const documentsTableBody = document.getElementById("documents-table-body");
const emptyState = document.getElementById("empty-state");

const diagUptime = document.getElementById("diag-uptime");
const diagMemory = document.getElementById("diag-memory");
const diagEnv = document.getElementById("diag-env");
const diagEndpoint = document.getElementById("diag-endpoint");

// --- Initialization & Setup ---
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  checkSystemHealth();
  fetchDocuments();
  
  // Auto-refresh health status every 30 seconds
  setInterval(checkSystemHealth, 30000);
});

function setupEventListeners() {
  // Method Toggles
  methodServerBtn.addEventListener("click", () => setUploadMethod("server"));
  methodPresignedBtn.addEventListener("click", () => setUploadMethod("presigned"));

  // Health Refresh Button
  refreshHealthBtn.addEventListener("click", () => {
    refreshHealthBtn.classList.add("fa-spin");
    checkSystemHealth().finally(() => {
      setTimeout(() => refreshHealthBtn.classList.remove("fa-spin"), 500);
    });
  });

  // Drag & Drop Interactions
  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileSelection);

  ["dragenter", "dragover"].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    }, false);
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
    }, false);
  });

  dropZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Search & Filters (Debounced)
  let searchTimeout;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    state.filters.search = e.target.value;
    searchTimeout = setTimeout(fetchDocuments, 300);
  });

  teamFilter.addEventListener("change", (e) => {
    state.filters.teamId = e.target.value;
    fetchDocuments();
  });
}

// --- Toggle Architectures ---
function setUploadMethod(method) {
  state.uploadMethod = method;
  if (method === "server") {
    methodServerBtn.classList.add("active");
    methodPresignedBtn.classList.remove("active");
  } else {
    methodPresignedBtn.classList.add("active");
    methodServerBtn.classList.remove("active");
  }
  console.log(`🔧 [Settings] Upload Architecture changed to: ${method.toUpperCase()}`);
}

// --- File Handling Engine ---
function handleFileSelection(e) {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
}

function handleFile(file) {
  if (state.isUploading) {
    alert("An upload is already in progress. Please wait.");
    return;
  }
  
  if (file.size > 50 * 1024 * 1024) {
    alert("File size exceeds 50MB. Please choose a smaller file.");
    return;
  }

  state.selectedFile = file;
  executeUpload();
}

// --- System Status Monitor ---
async function checkSystemHealth() {
  try {
    const response = await fetch("/api/system/health");
    const data = await response.json();
    
    // Update DB Node
    if (data.services.database.status === "connected") {
      dbDot.className = "status-dot green";
      dbText.textContent = "CONNECTED";
    } else {
      dbDot.className = "status-dot red pulsing";
      dbText.textContent = "DISCONNECTED";
    }

    // Update S3 Node
    if (data.services.s3.status === "connected") {
      s3Dot.className = "status-dot green";
      s3Text.textContent = "ACTIVE";
    } else {
      s3Dot.className = "status-dot red pulsing";
      s3Text.textContent = "FAILED";
    }

    // Update System Diagnostics
    diagUptime.textContent = formatUptime(data.uptime);
    diagMemory.textContent = `${Math.round(data.diagnostics.memoryUsage.heapUsed / 1024 / 1024)} MB`;
    diagEnv.textContent = data.environment.toUpperCase();
    
    const ep = data.services.s3.customEndpoint;
    diagEndpoint.textContent = ep === "none" ? "AWS Global Cloud" : ep;
    diagEndpoint.title = ep;
  } catch (err) {
    console.error("🏥 [Health Monitor] Check failed:", err);
    dbDot.className = "status-dot red pulsing";
    dbText.textContent = "ERROR";
    s3Dot.className = "status-dot red pulsing";
    s3Text.textContent = "ERROR";
  }
}

// --- Upload Execution Pipeline ---
async function executeUpload() {
  const file = state.selectedFile;
  if (!file) return;

  state.isUploading = true;
  showProgressContainer(file.name);
  updateProgressBar(0, "Initiating secure handshakes...");

  const uploadedBy = uploaderNameInput.value.trim() || "Anonymous";
  const teamId = teamIdInput.value.trim() || "General";

  if (state.uploadMethod === "server") {
    // === METHOD A: STANDARD SERVER-SIDE PROXY ===
    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploadedBy", uploadedBy);
    formData.append("teamId", teamId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents/upload-server", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        updateProgressBar(percentComplete, `Proxying: ${percentComplete}% loaded...`);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        completeUploadSuccess("Server upload complete! Document saved.");
      } else {
        const err = JSON.parse(xhr.responseText || '{"error":{"message":"Upload failed"}}');
        completeUploadError(err.error?.message || "Server upload proxy failed.");
      }
    };

    xhr.onerror = () => completeUploadError("Network connection to Express failed.");
    xhr.send(formData);

  } else {
    // === METHOD B: DIRECT CLIENT-TO-S3 VIA PRESIGNED URL ===
    try {
      updateProgressBar(10, "Fetching timed S3 secure signature...");
      
      // Step 1: Query presigned URL
      const urlQuery = `/api/documents/upload-url?fileName=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type)}&teamId=${encodeURIComponent(teamId)}`;
      const signResponse = await fetch(urlQuery);
      
      if (!signResponse.ok) {
        throw new Error("Could not acquire S3 upload signature.");
      }
      
      const signData = await signResponse.json();
      const { uploadUrl, s3Key } = signData;

      updateProgressBar(30, "S3 signature received. Direct streaming starting...");

      // Step 2: PUT request raw file buffer to S3 presigned URL
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // Map 30% to 95% progress range for direct upload
          const subPercent = Math.round((event.loaded / event.total) * 65);
          const percentComplete = 30 + subPercent;
          updateProgressBar(percentComplete, `Streaming directly to S3: ${Math.round((event.loaded / event.total) * 100)}%...`);
        }
      };

      xhr.onload = async () => {
        // AWS S3 responds with 200 OK on successful PUT upload
        if (xhr.status === 200) {
          updateProgressBar(95, "S3 upload complete. Logging DB metadata...");
          
          // Step 3: Register metadata in MySQL database
          try {
            const dbResponse = await fetch("/api/documents/metadata", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type || "application/octet-stream",
                s3Key: s3Key,
                uploadedBy,
                teamId
              })
            });

            if (!dbResponse.ok) {
              throw new Error("Failed to register document metadata in database.");
            }

            completeUploadSuccess("Direct S3 upload & metadata sync successful!");
          } catch (dbErr) {
            completeUploadError(`File uploaded to S3, but DB sync failed: ${dbErr.message}`);
          }
        } else {
          completeUploadError(`Direct S3 upload failed. HTTP status: ${xhr.status}`);
        }
      };

      xhr.onerror = () => completeUploadError("Network connection direct to S3 failed.");
      xhr.send(file);

    } catch (error) {
      completeUploadError(error.message);
    }
  }
}

// --- Dynamic Progress Displays ---
function showProgressContainer(name) {
  progressContainer.classList.remove("hidden");
  progressFilename.textContent = name;
  progressBarFill.style.width = "0%";
  progressPercentage.textContent = "0%";
}

function updateProgressBar(percentage, statusText) {
  progressBarFill.style.width = `${percentage}%`;
  progressPercentage.textContent = `${percentage}%`;
  progressStatus.textContent = statusText;
}

function completeUploadSuccess(successMessage) {
  updateProgressBar(100, successMessage);
  progressBarFill.style.background = "var(--color-success)";
  progressPercentage.style.color = "var(--color-success)";
  
  setTimeout(() => {
    progressContainer.classList.add("hidden");
    resetUploadState();
    fetchDocuments();
  }, 2500);
}

function completeUploadError(errorMessage) {
  updateProgressBar(100, `Error: ${errorMessage}`);
  progressBarFill.style.background = "var(--color-danger)";
  progressPercentage.style.color = "var(--color-danger)";
  progressStatus.style.color = "var(--color-danger)";
  
  setTimeout(() => {
    progressContainer.classList.add("hidden");
    progressStatus.style.color = ""; // reset color
    resetUploadState();
  }, 6000);
}

function resetUploadState() {
  state.selectedFile = null;
  state.isUploading = false;
  fileInput.value = "";
}

// --- Fetch & Sync Repository Records ---
async function fetchDocuments() {
  try {
    let query = "/api/documents";
    const params = [];
    if (state.filters.search) params.push(`search=${encodeURIComponent(state.filters.search)}`);
    if (state.filters.teamId) params.push(`teamId=${encodeURIComponent(state.filters.teamId)}`);
    
    if (params.length > 0) {
      query += `?${params.join("&")}`;
    }

    const response = await fetch(query);
    const data = await response.json();

    if (data.success) {
      renderDocuments(data.data);
    } else {
      console.error("🗃️ [DB Sync] Fetching document indices failed.");
    }
  } catch (err) {
    console.error("🗃️ [DB Sync] Error pulling repository indices:", err);
    documentsTableBody.innerHTML = `
      <tr class="table-state-row">
        <td colspan="5" class="text-gradient-gold">
          <i class="fa-solid fa-triangle-exclamation"></i> Error loading repository indexes. Check DB server.
        </td>
      </tr>
    `;
  }
}

function renderDocuments(documents) {
  if (documents.length === 0) {
    documentsTableBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  
  documentsTableBody.innerHTML = documents.map(doc => {
    const ext = doc.file_name.split(".").pop().toLowerCase();
    const extTheme = getExtensionTheme(ext);
    
    return `
      <tr id="doc-row-${doc.id}">
        <td>
          <div class="file-cell">
            <div class="file-icon-bg ${extTheme.bgClass}">
              <i class="${extTheme.iconClass}"></i>
            </div>
            <div style="overflow: hidden;">
              <div class="file-name-text" title="${escapeHtml(doc.file_name)}">${escapeHtml(doc.file_name)}</div>
              <div class="file-meta-sub">Uploaded ${formatDate(doc.created_at)}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="key-cell" title="${escapeHtml(doc.s3_key)}">${escapeHtml(doc.s3_key)}</div>
        </td>
        <td class="size-cell">${formatBytes(doc.file_size)}</td>
        <td>
          <div class="user-badge">
            <i class="fa-solid fa-circle-user"></i>
            <span>${escapeHtml(doc.uploaded_by)}</span>
          </div>
          <span class="team-tag">#${escapeHtml(doc.team_id)}</span>
        </td>
        <td>
          <div class="action-buttons">
            <button onclick="downloadDocument('${doc.id}')" class="btn btn-primary" title="Generate timed secure S3 URL to download">
              <i class="fa-solid fa-cloud-arrow-down"></i> Download
            </button>
            <button onclick="deleteDocument('${doc.id}')" class="btn btn-danger" title="Purge from S3 bucket and Database">
              <i class="fa-solid fa-trash-can"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// --- Download Secure Presigned links ---
async function downloadDocument(id) {
  try {
    const response = await fetch(`/api/documents/${id}/download`);
    const data = await response.json();
    
    if (data.success && data.downloadUrl) {
      console.log(`🔗 [Download Secure] Opening timed link: ${data.fileName}`);
      
      // Open in a new tab or trigger a browser download programmatically
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.setAttribute("download", data.fileName);
      link.target = "_blank"; // fall back for image views
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`Download failed: ${data.error?.message || 'Unknown error'}`);
    }
  } catch (err) {
    console.error("🔗 [Download Error] Presigned fetch failed:", err);
    alert("Could not fetch secure S3 download URL from backend.");
  }
}

// --- Delete Document Records ---
async function deleteDocument(id) {
  if (!confirm("Are you sure you want to permanently delete this document from S3 storage and the Database?")) {
    return;
  }

  try {
    const response = await fetch(`/api/documents/${id}`, {
      method: "DELETE"
    });
    
    const data = await response.json();
    if (data.success) {
      // Clean up row immediately in frontend
      const row = document.getElementById(`doc-row-${id}`);
      if (row) {
        row.style.animation = "slideOut 0.3s forwards";
        setTimeout(fetchDocuments, 300);
      } else {
        fetchDocuments();
      }
    } else {
      alert(`Deletion failed: ${data.error?.message || 'Unknown error'}`);
    }
  } catch (err) {
    console.error("🗑️ [Deletion Error] Delete request failed:", err);
    alert("Connection error: Could not complete deletion.");
  }
}

// --- Utility Helper Functions ---
function getExtensionTheme(ext) {
  const mapping = {
    pdf: { bgClass: "ext-pdf", iconClass: "fa-solid fa-file-pdf" },
    png: { bgClass: "ext-image", iconClass: "fa-solid fa-file-image" },
    jpg: { bgClass: "ext-image", iconClass: "fa-solid fa-file-image" },
    jpeg: { bgClass: "ext-image", iconClass: "fa-solid fa-file-image" },
    gif: { bgClass: "ext-image", iconClass: "fa-solid fa-file-image" },
    svg: { bgClass: "ext-image", iconClass: "fa-solid fa-file-image" },
    xlsx: { bgClass: "ext-sheet", iconClass: "fa-solid fa-file-excel" },
    xls: { bgClass: "ext-sheet", iconClass: "fa-solid fa-file-excel" },
    csv: { bgClass: "ext-sheet", iconClass: "fa-solid fa-file-csv" },
    doc: { bgClass: "ext-doc", iconClass: "fa-solid fa-file-word" },
    docx: { bgClass: "ext-doc", iconClass: "fa-solid fa-file-word" },
    txt: { bgClass: "ext-generic", iconClass: "fa-solid fa-file-lines" },
    log: { bgClass: "ext-generic", iconClass: "fa-solid fa-file-code" },
    json: { bgClass: "ext-generic", iconClass: "fa-solid fa-file-code" },
    zip: { bgClass: "ext-generic", iconClass: "fa-solid fa-file-zipper" },
    rar: { bgClass: "ext-generic", iconClass: "fa-solid fa-file-zipper" }
  };
  
  return mapping[ext] || { bgClass: "ext-generic", iconClass: "fa-solid fa-file" };
}

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const hDisplay = h > 0 ? `${h}h ` : "";
  const mDisplay = m > 0 ? `${m}m ` : "";
  const sDisplay = `${s}s`;
  
  return hDisplay + mDisplay + sDisplay;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
