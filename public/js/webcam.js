class WebcamCapture {
    constructor(videoElement, canvasElement, captureButton, retakeButton) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.captureButton = captureButton;
        this.retakeButton = retakeButton;
        this.stream = null;
        this.photoTaken = false;
        
        this.init();
    }

    async init() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: "user"
                }, 
                audio: false 
            });
            this.videoElement.srcObject = this.stream;
            
            this.captureButton.addEventListener('click', () => this.capturePhoto());
            this.retakeButton.addEventListener('click', () => this.retakePhoto());
            
            this.retakeButton.style.display = 'none';
        } catch (err) {
            console.error('Error accessing webcam:', err);
            alert('Unable to access webcam. Please ensure you have given camera permissions.');
        }
    }

    capturePhoto() {
        const context = this.canvasElement.getContext('2d');
        
        // Set canvas dimensions to match video
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(this.videoElement, 0, 0);
        
        // Hide video and capture button, show canvas and retake button
        this.videoElement.style.display = 'none';
        this.canvasElement.style.display = 'block';
        this.captureButton.style.display = 'none';
        this.retakeButton.style.display = 'block';
        
        this.photoTaken = true;
    }

    retakePhoto() {
        // Show video and capture button, hide canvas and retake button
        this.videoElement.style.display = 'block';
        this.canvasElement.style.display = 'none';
        this.captureButton.style.display = 'block';
        this.retakeButton.style.display = 'none';
        
        this.photoTaken = false;
    }

    getImageData() {
        if (!this.photoTaken) return null;
        return this.canvasElement.toDataURL('image/jpeg');
    }

    stopStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
} 