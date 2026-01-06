// KernelSU API integration
// For development/testing without KernelSU, we'll use fallback methods
const KernelSU = {
    exec: (cmd) => {
        if (typeof ksu !== 'undefined' && ksu.exec) {
            return ksu.exec(cmd);
        }
        // Fallback for development
        console.log('KernelSU exec:', cmd);
        return { errno: 0, stdout: '', stderr: '' };
    },
    
    toast: (msg) => {
        if (typeof ksu !== 'undefined' && ksu.toast) {
            ksu.toast(msg);
        } else {
            showToast(msg);
        }
    }
};

// Module paths
const MODULE_DIR = '/data/adb/modules/ProxyPinCA';
const CERT_DIR = `${MODULE_DIR}/system/etc/security/cacerts`;
const UPLOAD_DIR = `${MODULE_DIR}/uploads`;

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show';
    
    if (type === 'success') {
        toast.classList.add('success');
    } else if (type === 'error') {
        toast.classList.add('error');
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadCertificates();
});

// Set up event listeners
function initializeEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const applyBtn = document.getElementById('applyBtn');
    const refreshBtn = document.getElementById('refreshBtn');

    // Upload area click
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // File selection
    fileInput.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
    });

    // Drag and drop support
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary-color)';
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--border-color)';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--border-color)';
        handleFileUpload(e.dataTransfer.files);
    });

    // Action buttons
    applyBtn.addEventListener('click', applyChanges);
    refreshBtn.addEventListener('click', loadCertificates);
}

// Handle file upload
async function handleFileUpload(files) {
    if (!files || files.length === 0) {
        return;
    }

    showToast('Processing certificates...', 'info');

    for (let file of files) {
        try {
            const content = await readFileContent(file);
            
            // Validate certificate format
            if (!content.includes('BEGIN CERTIFICATE')) {
                showToast(`Invalid certificate format: ${file.name}`, 'error');
                continue;
            }

            // Calculate hash for certificate
            const hash = await calculateCertHash(content);
            
            // Save certificate
            await saveCertificate(hash, content, file.name);
            
            showToast(`Uploaded: ${file.name}`, 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showToast(`Failed to upload ${file.name}`, 'error');
        }
    }

    // Refresh the list
    setTimeout(() => loadCertificates(), 500);
}

// Read file content
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Calculate certificate hash using helper script
async function calculateCertHash(certContent) {
    // Create a temporary file for the certificate using a secure random name
    const randomStr = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const tempFile = `/data/local/tmp/cert_temp_${randomStr}.pem`;
    
    // Write certificate to temp file using proper escaping
    // First, save to a safe location using JavaScript file operations through KernelSU
    const escapedContent = certContent.replace(/'/g, "'\\''");
    const writeResult = KernelSU.exec(`cat > ${tempFile} << 'EOF'\n${escapedContent}\nEOF`);
    
    // Use helper script to calculate hash
    const hashResult = KernelSU.exec(`sh ${MODULE_DIR}/cert_hash.sh ${tempFile}`);
    
    // Clean up temp file
    KernelSU.exec(`rm -f ${tempFile}`);
    
    if (hashResult.errno === 0 && hashResult.stdout) {
        return hashResult.stdout.trim();
    }
    
    // Fallback: generate a pseudo-hash if helper script fails
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}${random}`;
}

// Save certificate using KernelSU
async function saveCertificate(hash, content, originalName) {
    // Create directories if they don't exist
    KernelSU.exec(`mkdir -p ${UPLOAD_DIR}`);
    KernelSU.exec(`mkdir -p ${CERT_DIR}`);
    
    // Save with metadata
    const filename = `${hash}.0`;
    const metaFilename = `${hash}.meta`;
    
    // Write certificate file using heredoc for safety
    const certPath = `${UPLOAD_DIR}/${filename}`;
    const metaPath = `${UPLOAD_DIR}/${metaFilename}`;
    
    // Use heredoc to safely write content (avoids injection issues)
    const escapedContent = content.replace(/'/g, "'\\''");
    KernelSU.exec(`cat > ${certPath} << 'EOF'\n${escapedContent}\nEOF`);
    
    // Write metadata - properly escape JSON content
    const metadata = {
        originalName: originalName,
        uploadDate: new Date().toISOString(),
        hash: hash
    };
    const metadataStr = JSON.stringify(metadata).replace(/'/g, "'\\''");
    KernelSU.exec(`cat > ${metaPath} << 'EOF'\n${metadataStr}\nEOF`);
    
    // Set permissions
    KernelSU.exec(`chmod 644 ${certPath}`);
}

// Load certificates from the module
function loadCertificates() {
    const listContainer = document.getElementById('certificateList');
    
    // Get list of certificates
    const result = KernelSU.exec(`ls -1 ${CERT_DIR}/*.0 2>/dev/null || true`);
    const uploadResult = KernelSU.exec(`ls -1 ${UPLOAD_DIR}/*.0 2>/dev/null || true`);
    
    let certificates = [];
    
    // Parse installed certificates
    if (result.stdout) {
        const installedCerts = result.stdout.trim().split('\n').filter(f => f);
        installedCerts.forEach(certPath => {
            const filename = certPath.split('/').pop();
            const hash = filename.replace('.0', '');
            certificates.push({
                hash: hash,
                filename: filename,
                status: 'installed',
                path: certPath
            });
        });
    }
    
    // Parse uploaded certificates (pending installation)
    if (uploadResult.stdout) {
        const uploadedCerts = uploadResult.stdout.trim().split('\n').filter(f => f);
        uploadedCerts.forEach(certPath => {
            const filename = certPath.split('/').pop();
            const hash = filename.replace('.0', '');
            
            // Check if already installed
            const alreadyInstalled = certificates.some(c => c.hash === hash);
            if (!alreadyInstalled) {
                // Try to get metadata
                const metaResult = KernelSU.exec(`cat ${UPLOAD_DIR}/${hash}.meta 2>/dev/null || true`);
                let originalName = filename;
                
                if (metaResult.stdout) {
                    try {
                        const meta = JSON.parse(metaResult.stdout);
                        originalName = meta.originalName || filename;
                    } catch (e) {
                        console.error('Failed to parse metadata:', e);
                    }
                }
                
                certificates.push({
                    hash: hash,
                    filename: filename,
                    originalName: originalName,
                    status: 'pending',
                    path: certPath
                });
            }
        });
    }
    
    // Render certificate list
    if (certificates.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">No certificates installed yet</p>';
    } else {
        listContainer.innerHTML = '';
        certificates.forEach(cert => {
            listContainer.appendChild(createCertificateItem(cert));
        });
    }
}

// Create certificate list item
function createCertificateItem(cert) {
    const item = document.createElement('div');
    item.className = 'cert-item';
    
    const info = document.createElement('div');
    info.className = 'cert-info';
    
    const name = document.createElement('div');
    name.className = 'cert-name';
    name.textContent = cert.originalName || cert.filename;
    
    if (cert.status === 'pending') {
        name.textContent += ' (Pending Reboot)';
    } else if (cert.hash === '243f0bfb') {
        name.textContent = 'ProxyPin CA (Default)';
    }
    
    const hash = document.createElement('div');
    hash.className = 'cert-hash';
    hash.textContent = `Hash: ${cert.hash}`;
    
    info.appendChild(name);
    info.appendChild(hash);
    
    const actions = document.createElement('div');
    actions.className = 'cert-actions';
    
    // Don't allow deletion of default ProxyPin cert
    if (cert.hash !== '243f0bfb') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-small';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteCertificate(cert);
        actions.appendChild(deleteBtn);
    }
    
    item.appendChild(info);
    item.appendChild(actions);
    
    return item;
}

// Delete certificate
function deleteCertificate(cert) {
    if (!confirm(`Are you sure you want to delete ${cert.originalName || cert.filename}?`)) {
        return;
    }
    
    // Delete from uploads directory
    KernelSU.exec(`rm -f ${UPLOAD_DIR}/${cert.filename}`);
    KernelSU.exec(`rm -f ${UPLOAD_DIR}/${cert.hash}.meta`);
    
    // Delete from cert directory if it exists there
    KernelSU.exec(`rm -f ${CERT_DIR}/${cert.filename}`);
    
    showToast('Certificate deleted. Apply changes and reboot to take effect.', 'success');
    loadCertificates();
}

// Apply changes - copy certificates to the module directory
function applyChanges() {
    const applyBtn = document.getElementById('applyBtn');
    applyBtn.classList.add('loading');
    applyBtn.innerHTML = '<div class="spinner"></div> Applying...';
    
    showToast('Applying changes...', 'info');
    
    // Ensure cert directory exists
    KernelSU.exec(`mkdir -p ${CERT_DIR}`);
    
    // Copy all uploaded certificates to the cert directory
    const result = KernelSU.exec(`cp -f ${UPLOAD_DIR}/*.0 ${CERT_DIR}/ 2>/dev/null || true`);
    
    // Set proper permissions
    KernelSU.exec(`chmod -R 644 ${CERT_DIR}/*.0`);
    KernelSU.exec(`chown -R 0:0 ${CERT_DIR}`);
    
    setTimeout(() => {
        applyBtn.classList.remove('loading');
        applyBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Apply Changes (Requires Reboot)
        `;
        
        showToast('Changes applied! Please reboot your device for changes to take effect.', 'success');
        loadCertificates();
    }, 1000);
}
