// Constellation Canvas - Enhanced & Smooth like bratku
const canvas = document.getElementById('constellation');
const ctx = canvas.getContext('2d');

let particles = [];
let mouse = { x: null, y: null };
const connectionDistance = 150;
const mouseRadius = 200;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
}

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.5;
        this.fadeSpeed = (Math.random() * 0.01) + 0.005;
        this.fadeDirection = Math.random() > 0.5 ? 1 : -1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < -10) this.x = canvas.width + 10;
        if (this.x > canvas.width + 10) this.x = -10;
        if (this.y < -10) this.y = canvas.height + 10;
        if (this.y > canvas.height + 10) this.y = -10;

        if (mouse.x !== null && mouse.y !== null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const maxDistance = mouseRadius;
            const force = (maxDistance - distance) / maxDistance;
            
            if (distance < mouseRadius) {
                const directionX = forceDirectionX * force * this.density * 0.2;
                const directionY = forceDirectionY * force * this.density * 0.2;
                this.x -= directionX;
                this.y -= directionY;
            }
        }

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

function initParticles() {
    particles = [];
    const numberOfParticles = Math.floor((canvas.width * canvas.height) / 9000);
    for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle());
    }
}

function connectParticles() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < connectionDistance) {
                const opacity = (1 - distance / connectionDistance) * 0.3;
                ctx.save();
                ctx.globalAlpha = opacity * particles[i].opacity * particles[j].opacity;
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

resizeCanvas();
animate();

window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
});

// Upload & Generate Logic
const uploadBoxes = {
    1: document.getElementById('uploadBox1'), 
    2: document.getElementById('uploadBox2')  
};

const fileInputs = {
    1: document.getElementById('file1'),
    2: document.getElementById('file2')
};

const previews = {
    1: document.getElementById('preview1'),
    2: document.getElementById('preview2')
};

const progressBars = {
    1: document.getElementById('progress1'),
    2: document.getElementById('progress2')
};

let uploadedImages = { img1: null, img2: null };
let generatedPolaroidData = null; // Store the base64 data

// Setup upload handlers
Object.keys(uploadBoxes).forEach(key => {
    const box = uploadBoxes[key];
    const input = fileInputs[key];
    
    box.addEventListener('click', () => input.click());
    
    box.addEventListener('dragover', (e) => {
        e.preventDefault();
        box.style.borderColor = 'rgba(123, 104, 238, 0.8)';
        box.style.background = 'rgba(123, 104, 238, 0.15)';
    });
    
    box.addEventListener('dragleave', () => {
        box.style.borderColor = '';
        box.style.background = '';
    });
    
    box.addEventListener('drop', (e) => {
        e.preventDefault();
        box.style.borderColor = '';
        box.style.background = '';
        
        const file = e.dataTransfer.files[0];
        if (file) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
            handleFileSelect({ target: input }, key);
        }
    });
    
    input.addEventListener('change', (e) => handleFileSelect(e, key));
});

function handleFileSelect(event, boxNumber) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showErrorModal(
            new Error('File tidak valid'),
            `File Type: ${file.type}\nFile Name: ${file.name}\nExpected: image/jpeg, image/png, image/webp`
        );
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showErrorModal(
            new Error('Ukuran file terlalu besar'),
            `File Size: ${(file.size / 1024 / 1024).toFixed(2)} MB\nMax Size: 10 MB\nFile Name: ${file.name}`
        );
        return;
    }

    const progress = progressBars[boxNumber];
    const progressBar = progress.querySelector('.progress-fill');
    progress.classList.add('show');
    progressBar.style.width = '30%';

    const reader = new FileReader();
    reader.onload = (e) => {
        progressBar.style.width = '70%';
        
        const preview = previews[boxNumber];
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        preview.classList.add('show');
        uploadBoxes[boxNumber].classList.add('has-file');
        
        uploadedImages[`img${boxNumber}`] = e.target.result;
        
        progressBar.style.width = '100%';
        
        setTimeout(() => {
            progress.classList.remove('show');
            progressBar.style.width = '0%';
        }, 500);

        showNotification('Gambar berhasil diupload!', 'success');
        checkGenerateButton();
    };
    
    reader.onerror = () => {
        progressBar.style.width = '0%';
        progress.classList.remove('show');
        
        showErrorModal(
            new Error('Gagal membaca file'),
            `File Name: ${file.name}\nFile Size: ${(file.size / 1024).toFixed(2)} KB\nError: FileReader error`
        );
    };
    
    reader.readAsDataURL(file);
}

function checkGenerateButton() {
    const btn = document.getElementById('generateBtn');
    btn.disabled = !(uploadedImages.img1 && uploadedImages.img2);
}

// Generate Polaroid with Backend API
document.getElementById('generateBtn').addEventListener('click', async () => {
    if (!uploadedImages.img1 || !uploadedImages.img2) return;

    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const polaroidImg = document.getElementById('polaroidImg');
    const resultSection = document.getElementById('resultSection');

    // GANTI dengan URL Vercel Anda
    const API_URL = 'https://your-backend.vercel.app/api/upload';

    try {
        loading.classList.add('show');
        result.classList.remove('show');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

        showNotification('Membuat polaroid...', 'info');

        // Call backend API dengan timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                img1: uploadedImages.img1,
                img2: uploadedImages.img2
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.image) {
            throw new Error('Invalid response from server');
        }

        // Store the base64 data for download
        generatedPolaroidData = data.image;

        // Display image dengan CORS-safe method
        // Gunakan base64 data URL langsung
        polaroidImg.src = data.image;
        
        polaroidImg.onload = () => {
            loading.classList.remove('show');
            result.classList.add('show');
            
            // Show download and reset buttons
            document.querySelector('.result-actions').style.display = 'flex';
            
            showNotification('Polaroid berhasil dibuat! 🎉', 'success');
            
            // Scroll to result smoothly
            setTimeout(() => {
                result.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        };

        polaroidImg.onerror = () => {
            loading.classList.remove('show');
            throw new Error('Failed to load generated image');
        };

    } catch (error) {
        console.error('Generate error:', error);
        loading.classList.remove('show');
        
        let errorMessage = 'Gagal membuat polaroid';
        let errorDetails = `
Error Type: ${error.name || 'Unknown'}
Error Message: ${error.message || 'Unknown error'}
Timestamp: ${new Date().toISOString()}
API URL: ${API_URL}

Possible causes:
- Network connection issue
- Backend server is down
- API rate limit exceeded
- Invalid image format

Stack Trace:
${error.stack || 'No stack trace available'}
        `.trim();

        if (error.name === 'AbortError') {
            errorMessage = 'Request timeout';
            errorDetails = 'The request took too long to complete. Please try again with smaller images.';
        }
        
        showErrorModal(new Error(errorMessage), errorDetails);
        showNotification(errorMessage, 'error');
    }
});

// Download dengan CORS-safe method
document.getElementById('downloadBtn').addEventListener('click', async () => {
    try {
        if (!generatedPolaroidData) {
            showNotification('Tidak ada gambar untuk diunduh', 'error');
            return;
        }

        // Method 1: Direct download dari base64 data
        const link = document.createElement('a');
        link.href = generatedPolaroidData;
        link.download = `polaroid-${Date.now()}.png`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Download berhasil! 📥', 'success');

    } catch (error) {
        console.error('Download error:', error);
        
        // Fallback: Open in new tab
        try {
            const newWindow = window.open();
            newWindow.document.write(`
                <html>
                    <head><title>Polaroid Result</title></head>
                    <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                        <img src="${generatedPolaroidData}" style="max-width:100%;height:auto;">
                    </body>
                </html>
            `);
            showNotification('Gambar dibuka di tab baru. Klik kanan > Save Image', 'info');
        } catch (fallbackError) {
            showNotification('Gagal mendownload. Coba klik kanan pada gambar > Save Image', 'error');
        }
    }
});

// Reset - Clear everything
document.getElementById('resetBtn').addEventListener('click', () => {
    // Clear file inputs
    fileInputs[1].value = '';
    fileInputs[2].value = '';
    
    // Remove file states
    uploadBoxes[1].classList.remove('has-file');
    uploadBoxes[2].classList.remove('has-file');
    
    // Clear previews
    previews[1].classList.remove('show');
    previews[2].classList.remove('show');
    previews[1].innerHTML = '';
    previews[2].innerHTML = '';
    
    // Reset data
    uploadedImages = { img1: null, img2: null };
    generatedPolaroidData = null;
    
    // Hide result
    document.getElementById('result').classList.remove('show');
    document.getElementById('loading').classList.remove('show');
    
    // Hide buttons
    document.querySelector('.result-actions').style.display = 'none';
    
    // Reset button
    checkGenerateButton();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    showNotification('Siap untuk polaroid baru! ✨', 'success');
});

// Notification System
function showNotification(message, type = 'info') {
    const existingNotifs = document.querySelectorAll('.notification');
    existingNotifs.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Error Modal System
function showErrorModal(error, details = null) {
    const existingModal = document.querySelector('.error-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'error-modal';
    
    modal.innerHTML = `
        <div class="error-content">
            <div class="error-header">
                <div class="error-icon">⚠️</div>
                <h3>Error Terjadi</h3>
            </div>
            <div class="error-message">
                ${error.message || 'Terjadi kesalahan yang tidak diketahui'}
            </div>
            ${details ? `
                <div class="error-details">
                    <pre>${details}</pre>
                </div>
            ` : ''}
            <div class="error-actions">
                <button class="error-btn secondary" onclick="this.closest('.error-modal').remove()">
                    Tutup
                </button>
                <button class="error-btn primary" onclick="location.reload()">
                    Refresh Halaman
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

console.log('🌟 Polaroid Generator Ready!');
console.log('✨ Created by Ditzz with Claude AI');
console.log('📦 Version: 2.0 with CORS handling');
