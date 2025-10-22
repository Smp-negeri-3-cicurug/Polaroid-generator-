// ============================================
// CONSTELLATION CANVAS ANIMATION
// ============================================

const canvas = document.getElementById('constellation');
const ctx = canvas.getContext('2d');

const config = {
  connectionDistance: 150,
  mouseRadius: 200,
  particleDensity: 9000
};

let particles = [];
let mouse = { x: null, y: null };

// Particle Class
class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 1;
    this.density = Math.random() * 30 + 1;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.opacity = Math.random() * 0.5 + 0.5;
    this.fadeSpeed = Math.random() * 0.01 + 0.005;
    this.fadeDirection = Math.random() > 0.5 ? 1 : -1;
  }

  update() {
    // Move particle
    this.x += this.vx;
    this.y += this.vy;

    // Wrap around screen edges
    if (this.x < -10) this.x = canvas.width + 10;
    if (this.x > canvas.width + 10) this.x = -10;
    if (this.y < -10) this.y = canvas.height + 10;
    if (this.y > canvas.height + 10) this.y = -10;

    // Mouse interaction
    if (mouse.x !== null && mouse.y !== null) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < config.mouseRadius) {
        const force = (config.mouseRadius - distance) / config.mouseRadius;
        const forceX = (dx / distance) * force * this.density * 0.2;
        const forceY = (dy / distance) * force * this.density * 0.2;
        this.x -= forceX;
        this.y -= forceY;
      }
    }

    // Fade animation
    this.opacity += this.fadeSpeed * this.fadeDirection;
    if (this.opacity >= 1 || this.opacity <= 0.3) {
      this.fadeDirection *= -1;
    }
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = '#5e81f4';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Canvas Functions
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initParticles();
}

function initParticles() {
  particles = [];
  const count = Math.floor((canvas.width * canvas.height) / config.particleDensity);
  for (let i = 0; i < count; i++) {
    particles.push(new Particle());
  }
}

function connectParticles() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < config.connectionDistance) {
        const lineOpacity = (1 - distance / config.connectionDistance) * 0.3;
        ctx.save();
        ctx.globalAlpha = lineOpacity * particles[i].opacity * particles[j].opacity;
        ctx.strokeStyle = '#5e81f4';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  particles.forEach(particle => {
    particle.update();
    particle.draw();
  });
  
  connectParticles();
  requestAnimationFrame(animate);
}

// Event Listeners for Canvas
window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener('mouseleave', () => {
  mouse.x = null;
  mouse.y = null;
});

// Initialize Canvas
resizeCanvas();
animate();


// ============================================
// POLAROID GENERATOR APP
// ============================================

const API_ENDPOINT = '/api/upload';

// App State
const appState = {
  selectedFiles: {
    file1: null,
    file2: null
  }
};

// DOM Elements
const elements = {
  uploadBoxes: {},
  fileInputs: {},
  previews: {},
  generateBtn: null,
  loading: null,
  result: null,
  resultSection: null,
  polaroidImg: null,
  downloadBtn: null,
  resetBtn: null,
  footer: null
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
  initElements();
  setupEventListeners();
});

function initElements() {
  elements.uploadBoxes = {
    1: document.getElementById('uploadBox1'),
    2: document.getElementById('uploadBox2')
  };
  
  elements.fileInputs = {
    1: document.getElementById('file1'),
    2: document.getElementById('file2')
  };
  
  elements.previews = {
    1: document.getElementById('preview1'),
    2: document.getElementById('preview2')
  };
  
  elements.generateBtn = document.getElementById('generateBtn');
  elements.loading = document.getElementById('loading');
  elements.result = document.getElementById('result');
  elements.resultSection = document.getElementById('resultSection');
  elements.polaroidImg = document.getElementById('polaroidImg');
  elements.downloadBtn = document.getElementById('downloadBtn');
  elements.resetBtn = document.getElementById('resetBtn');
  elements.footer = document.querySelector('.footer');
}

function setupEventListeners() {
  // Upload handlers
  Object.keys(elements.uploadBoxes).forEach(key => {
    setupUploadBox(key);
  });
  
  // Action buttons
  elements.generateBtn.addEventListener('click', generatePolaroid);
  elements.downloadBtn.addEventListener('click', downloadResult);
  elements.resetBtn.addEventListener('click', resetApp);
}

function setupUploadBox(key) {
  const box = elements.uploadBoxes[key];
  const input = elements.fileInputs[key];
  const preview = elements.previews[key];
  
  // Click to upload
  box.addEventListener('click', () => input.click());
  
  // File input change
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file, key, box, preview);
  });
  
  // Drag over
  box.addEventListener('dragover', (e) => {
    e.preventDefault();
    box.style.borderColor = 'rgba(123, 104, 238, 0.8)';
    box.style.background = 'rgba(123, 104, 238, 0.15)';
  });
  
  // Drag leave
  box.addEventListener('dragleave', () => {
    box.style.borderColor = '';
    box.style.background = '';
  });
  
  // Drop
  box.addEventListener('drop', (e) => {
    e.preventDefault();
    box.style.borderColor = '';
    box.style.background = '';
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, key, box, preview);
  });
}

// File Handling
function handleFile(file, number, box, preview) {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showNotification('Mohon pilih file gambar', 'error');
    return;
  }
  
  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    showNotification('Ukuran file harus kurang dari 10MB', 'error');
    return;
  }
  
  // Store file
  appState.selectedFiles[`file${number}`] = file;
  
  // Show preview
  const reader = new FileReader();
  reader.onload = function(e) {
    preview.innerHTML = `<img src="${e.target.result}" alt="Preview ${number}">`;
    preview.classList.add('show');
    box.classList.add('has-file');
    
    checkGenerateButton();
    showNotification(`Gambar ${number} berhasil diupload`, 'success');
  };
  reader.readAsDataURL(file);
}

function checkGenerateButton() {
  const hasAllFiles = appState.selectedFiles.file1 && appState.selectedFiles.file2;
  elements.generateBtn.disabled = !hasAllFiles;
}

// Generate Polaroid
async function generatePolaroid() {
  if (!appState.selectedFiles.file1 || !appState.selectedFiles.file2) {
    showNotification('Upload kedua gambar terlebih dahulu', 'error');
    return;
  }
  
  try {
    // Show loading state
    elements.loading.classList.add('show');
    elements.result.classList.remove('show');
    elements.generateBtn.disabled = true;
    elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    showNotification('Membuat polaroid...', 'info');
    
    // Convert files to base64
    const base64_1 = await toBase64(appState.selectedFiles.file1);
    const base64_2 = await toBase64(appState.selectedFiles.file2);
    
    // Call API
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ img1: base64_1, img2: base64_2 })
    });
    
    // Handle API errors
    if (!response.ok) {
      let errMsg = 'Gagal membuat polaroid';
      try {
        const err = await response.json();
        errMsg = err.message || err.error || errMsg;
      } catch(e) {}
      throw new Error(errMsg);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.result) {
      throw new Error('Invalid response from server');
    }
    
    // Set result image
    elements.polaroidImg.src = data.result;
    elements.polaroidImg.dataset.originalUrl = data.result;
    
    // Enable action buttons
    elements.downloadBtn.disabled = false;
    elements.resetBtn.disabled = false;
    
    // Handle image load
    elements.polaroidImg.onload = function() {
      elements.loading.classList.remove('show');
      elements.result.classList.add('show');
      
      // Dynamic footer positioning - push footer down
      if (elements.footer) {
        elements.footer.style.marginTop = 'auto';
      }
      
      showNotification('Polaroid berhasil dibuat! 🎉', 'success');
      
      setTimeout(() => {
        elements.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    };
    
    elements.polaroidImg.onerror = function() {
      throw new Error('Failed to load generated image');
    };
    
  } catch (error) {
    console.error('Error:', error);
    elements.loading.classList.remove('show');
    showNotification(error.message || 'Gagal membuat polaroid. Silakan coba lagi.', 'error');
  } finally {
    elements.generateBtn.disabled = false;
  }
}

// Download Result
function downloadResult() {
  const originalUrl = elements.polaroidImg.dataset.originalUrl || elements.polaroidImg.src;
  
  if (!originalUrl) {
    showNotification('Tidak ada gambar untuk didownload', 'error');
    return;
  }
  
  // Handle data URL
  if (originalUrl.startsWith('data:')) {
    downloadDataUrl(originalUrl);
    return;
  }
  
  // Handle remote URL
  downloadRemoteUrl(originalUrl);
}

function downloadDataUrl(dataUrl) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `polaroid_${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification('Download dimulai...', 'success');
}

function downloadRemoteUrl(url) {
  fetch(url)
    .then(resp => resp.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `polaroid_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showNotification('Download dimulai...', 'success');
    })
    .catch(err => {
      console.warn('Fetch download failed, opening in new tab', err);
      window.open(url, '_blank');
      showNotification('Membuka gambar di tab baru...', 'info');
    });
}

// Reset App
function resetApp() {
  // Clear state
  appState.selectedFiles = {
    file1: null,
    file2: null
  };
  
  // Clear inputs
  elements.fileInputs[1].value = '';
  elements.fileInputs[2].value = '';
  
  // Clear previews
  elements.previews[1].classList.remove('show');
  elements.previews[2].classList.remove('show');
  elements.previews[1].innerHTML = '';
  elements.previews[2].innerHTML = '';
  
  // Remove has-file class
  elements.uploadBoxes[1].classList.remove('has-file');
  elements.uploadBoxes[2].classList.remove('has-file');
  
  // Clear result
  elements.polaroidImg.src = '';
  elements.polaroidImg.dataset.originalUrl = '';
  
  // Reset UI state
  elements.result.classList.remove('show');
  elements.loading.classList.remove('show');
  elements.downloadBtn.disabled = true;
  elements.resetBtn.disabled = false;
  elements.generateBtn.disabled = true;
  
  // Dynamic footer positioning - bring footer closer
  if (elements.footer) {
    elements.footer.style.marginTop = '40px';
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  showNotification('Siap membuat polaroid baru! ✨', 'success');
}

// Utility Functions
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showNotification(message, type = 'info') {
  // Remove existing notifications
  document.querySelectorAll('.notification').forEach(n => n.remove());
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
        }
