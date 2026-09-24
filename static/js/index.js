window.HELP_IMPROVE_VIDEOJS = false;

// More Works Dropdown Functionality
function toggleMoreWorks() {
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    } else {
        dropdown.classList.add('show');
        button.classList.add('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const container = document.querySelector('.more-works-container');
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    
    if (container && !container.contains(event.target)) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Close dropdown on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const dropdown = document.getElementById('moreWorksDropdown');
        const button = document.querySelector('.more-works-btn');
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Copy BibTeX to clipboard
function copyBibTeX() {
    const bibtexElement = document.getElementById('bibtex-code');
    const button = document.querySelector('.copy-bibtex-btn');
    const copyText = button.querySelector('.copy-text');
    
    if (bibtexElement) {
        navigator.clipboard.writeText(bibtexElement.textContent).then(function() {
            // Success feedback
            button.classList.add('copied');
            copyText.textContent = 'Cop';
            
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        }).catch(function(err) {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = bibtexElement.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            button.classList.add('copied');
            copyText.textContent = 'Cop';
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        });
    }
}

// Scroll to top functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll to top button
window.addEventListener('scroll', function() {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (window.pageYOffset > 300) {
        scrollButton.classList.add('visible');
    } else {
        scrollButton.classList.remove('visible');
    }
});

// Swap in a lazy video's real source (if not already loaded) and play it.
function loadAndPlayVideo(video) {
    if (!video) return;

    if (video.dataset.loaded !== 'true') {
        const source = video.querySelector('source[data-src]');
        if (source) {
            source.src = source.dataset.src;
            video.load();
            video.dataset.loaded = 'true';
        }
    }
    video.play().catch(e => {
        // Autoplay failed, probably due to browser policy
        console.log('Autoplay prevented:', e);
    });
}

// Lazy-load videos: only fetch a video's source (and start playing) once it
// scrolls near the viewport, and pause it once it scrolls back out. This
// avoids every video on the page trying to download at once on load. Videos
// inside an inactive carousel slide (display:none) never intersect, so only
// the currently-visible slide's video loads/plays.
function setupLazyVideos() {
    const videos = document.querySelectorAll('video[data-lazy]');

    if (videos.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                loadAndPlayVideo(video);
            } else {
                video.pause();
            }
        });
    }, {
        threshold: 0.15, // Trigger when 15% of the video is visible
        rootMargin: '200px 0px' // Start loading slightly before it's in view
    });

    videos.forEach(video => {
        observer.observe(video);
    });
}

// Simple one-clip-at-a-time video carousel (prev/next + dots), sized purely
// with CSS so it never depends on JS-computed pixel widths and can't overflow
// at any viewport size. Replaces bulma-carousel, whose fixed-width slides
// didn't recompute responsively and broke the mobile layout.
function setupVideoCarousels() {
    document.querySelectorAll('[data-carousel]').forEach(carousel => {
        const slides = [...carousel.querySelectorAll('[data-slide]')];
        const dots = [...carousel.querySelectorAll('.video-carousel-dot')];
        const prevBtn = carousel.querySelector('.video-carousel-prev');
        const nextBtn = carousel.querySelector('.video-carousel-next');

        if (slides.length === 0) return;

        let current = slides.findIndex(s => s.classList.contains('is-active'));
        if (current < 0) current = 0;

        function goTo(index) {
            const next = (index + slides.length) % slides.length;
            if (next === current) return;

            slides[current].classList.remove('is-active');
            if (dots[current]) dots[current].classList.remove('is-active');
            const video = slides[current].querySelector('video');
            if (video) video.pause();

            current = next;

            slides[current].classList.add('is-active');
            if (dots[current]) dots[current].classList.add('is-active');
            loadAndPlayVideo(slides[current].querySelector('video'));
        }

        if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));
        dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

        // Auto-advance to the next clip when the current one finishes, so the
        // carousel keeps cycling instead of stopping after the first video.
        slides.forEach((slide, i) => {
            const video = slide.querySelector('video');
            if (video) {
                video.addEventListener('ended', () => {
                    if (i === current) goTo(current + 1);
                });
            }
        });
    });
}

// Video controls setup - hide by default on mobile, show on tap
function setupVideoControls() {
    // Check if device is mobile/touch
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Only apply hiding behavior on mobile
    if (!isMobile) {
        return; // Keep default controls visible on desktop
    }
    
    const videos = document.querySelectorAll('video[controls]');
    
    videos.forEach(video => {
        // Hide controls initially on mobile
        video.removeAttribute('controls');
        
        let controlsTimeout;
        
        // Show controls on tap/touch
        video.addEventListener('touchstart', function(e) {
            clearTimeout(controlsTimeout);
            this.setAttribute('controls', 'controls');
            
            // Hide again after 3 seconds
            controlsTimeout = setTimeout(() => {
                this.removeAttribute('controls');
            }, 3000);
        });
        
        // Also show on click (for hybrid devices)
        video.addEventListener('click', function(e) {
            // Only handle if clicking on video itself, not controls
            if (e.target === this || e.target.tagName === 'VIDEO') {
                clearTimeout(controlsTimeout);
                this.setAttribute('controls', 'controls');
                
                // Hide again after 3 seconds
                controlsTimeout = setTimeout(() => {
                    this.removeAttribute('controls');
                }, 3000);
            }
        });
    });
}

$(document).ready(function() {
    bulmaSlider.attach();

    // Lazy-load and play/pause videos as they scroll into and out of view
    setupLazyVideos();

    // Wire up prev/next/dot navigation for video carousels
    setupVideoCarousels();

    // Setup video controls visibility
    setupVideoControls();

})
