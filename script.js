document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const BACKEND_URL = 'https://your-backend-url.up.railway.app/generate-mask-from-color';

    // --- DOM Elements ---
    const imageLoader = document.getElementById('image-loader');
    const imageContainer = document.getElementById('image-container');
    const sourceImage = document.getElementById('source-image');
    const toleranceSlider = document.getElementById('tolerance-slider');
    const toleranceValue = document.getElementById('tolerance-value');
    
    const maskImage = document.getElementById('mask-image');
    const downloadBtn = document.getElementById('download-btn');
    const loader = document.getElementById('loader');
    const placeholderText = document.getElementById('placeholder-text');

    let uploadedFile = null;

    // --- Event Listeners ---

    // 1. Handle file upload
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadedFile = file;
            const reader = new FileReader();
            reader.onload = (event) => {
                sourceImage.src = event.target.result;
                imageContainer.classList.remove('hidden');
                placeholderText.textContent = 'Now click on the image to select a color.';
            };
            reader.readAsDataURL(file);
        }
    });

    // 2. Handle clicks on the source image
    sourceImage.addEventListener('click', (e) => {
        if (!uploadedFile) {
            alert('Please upload an image first!');
            return;
        }

        // --- IMPORTANT: Calculate click coordinates relative to the ORIGINAL image size ---
        const rect = sourceImage.getBoundingClientRect();
        
        // naturalWidth/Height is the original image dimension
        // clientWidth/Height is the dimension of the <img> tag on the page
        const scaleX = sourceImage.naturalWidth / sourceImage.clientWidth;
        const scaleY = sourceImage.naturalHeight / sourceImage.clientHeight;

        // offsetX/Y is the click position relative to the <img> tag
        const realX = Math.floor(e.offsetX * scaleX);
        const realY = Math.floor(e.offsetY * scaleY);

        const tolerance = toleranceSlider.value;
        
        console.log(`Clicked at scaled coordinates: (${realX}, ${realY}) with tolerance ${tolerance}`);
        
        generateMask(realX, realY, tolerance);
    });

    // 3. Update tolerance display
    toleranceSlider.addEventListener('input', (e) => {
        toleranceValue.textContent = `Tolerance: ${e.target.value}`;
    });

    // --- Main function to call the backend ---
    async function generateMask(x, y, tolerance) {
        // Show loading state
        loader.classList.remove('hidden');
        maskImage.classList.add('hidden');
        placeholderText.classList.add('hidden');
        downloadBtn.classList.add('hidden');

        // Use FormData to send file and other data
        const formData = new FormData();
        formData.append('image', uploadedFile);
        formData.append('x', x);
        formData.append('y', y);
        formData.append('tolerance', tolerance);

        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                body: formData 
                // NOTE: Do NOT set 'Content-Type' header. The browser does it
                // automatically for FormData, including the boundary.
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
                throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
            }

            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);

            // Update UI with result
            maskImage.src = imageUrl;
            maskImage.classList.remove('hidden');
            
            downloadBtn.href = imageUrl;
            downloadBtn.classList.remove('hidden');

        } catch (error) {
            console.error('Error generating mask:', error);
            placeholderText.textContent = `Error: ${error.message}`;
            placeholderText.style.color = 'red';
            placeholderText.classList.remove('hidden');
        } finally {
            // Hide loading state
            loader.classList.add('hidden');
        }
    }
});
