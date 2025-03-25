document.addEventListener('DOMContentLoaded', function() {
    // Header scroll effect
    const header = document.querySelector('header');
    const scrollThreshold = 50;
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > scrollThreshold) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Check for elements to animate as they come into view
        checkForAnimations();
    });
    
    // Mobile menu toggle
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            
            // Animate hamburger to X
            const spans = menuToggle.querySelectorAll('span');
            if (navLinks.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Close mobile menu if open
            if (navLinks && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                const spans = menuToggle.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerHeight = header.offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // App screens carousel
    const indicators = document.querySelectorAll('.indicator');
    const screens = document.querySelectorAll('.screen-content img');
    const steps = document.querySelectorAll('.step');
    
    if (indicators.length > 0 && screens.length > 0) {
        indicators.forEach(indicator => {
            indicator.addEventListener('click', function() {
                // Get the screen ID from data attribute
                const screenId = this.getAttribute('data-screen');
                
                // Remove active class from all indicators and screens
                indicators.forEach(ind => ind.classList.remove('active'));
                screens.forEach(screen => screen.classList.remove('active'));
                steps.forEach(step => step.classList.remove('active'));
                
                // Add active class to clicked indicator and corresponding screen
                this.classList.add('active');
                document.getElementById(screenId).classList.add('active');
                
                // Find and activate the corresponding step
                const correspondingStep = document.querySelector(`.step[data-screen="${screenId}"]`);
                if (correspondingStep) {
                    correspondingStep.classList.add('active');
                }
            });
        });
        
        // Auto-cycle through screens every 5 seconds
        let currentIndex = 0;
        
        function cycleScreens() {
            currentIndex = (currentIndex + 1) % indicators.length;
            indicators[currentIndex].click();
        }
        
        // Start the auto-cycle
        let interval = setInterval(cycleScreens, 5000);
        
        // Pause auto-cycle when user interacts with indicators
        indicators.forEach(indicator => {
            indicator.addEventListener('click', function() {
                clearInterval(interval);
                // Restart after a pause
                setTimeout(() => {
                    interval = setInterval(cycleScreens, 5000);
                }, 10000);
            });
        });
    }
    
    // Animation on scroll
    function checkForAnimations() {
        const animatedElements = document.querySelectorAll('[data-animation]');
        
        animatedElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            const threshold = 100; // How many pixels before element comes into view
            
            if (elementTop < windowHeight - threshold) {
                // Get delay from data attribute or default to 0
                const delay = element.getAttribute('data-delay') || 0;
                
                // Apply the animation after the delay
                setTimeout(() => {
                    element.classList.add('in-view');
                }, delay);
            }
        });
    }
    
    // Initial check for elements in view
    checkForAnimations();
    
    // Initialize the first screen and step as active
    if (indicators.length > 0) {
        indicators[0].click();
    }
});