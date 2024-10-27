let audioCtx, gainNode, source, buffer, startTime, pauseTime, isPlaying = false;

document.addEventListener('DOMContentLoaded', function() {
    // Add this at the start
    function scrollPastHeader() {
        const header = document.querySelector('header');
        if (header && 'ontouchstart' in window) {
            // Force scroll past header immediately
            window.scrollTo(0, header.offsetHeight);
        }
    }

    // Call it multiple times to ensure it works
    scrollPastHeader();

    // Also call it after a tiny delay to ensure everything is loaded
    setTimeout(scrollPastHeader, 100);

    const playPauseButton = document.getElementById('playPauseButton');
    const stopButton = document.getElementById('stopButton');
    const volumeSlider = document.getElementById('volumeSlider');
    const speedSlider = document.getElementById('speedSlider');
    const volumeLabel = document.getElementById('volumeLabel');
    const speedLabel = document.getElementById('speedLabel');
    const car = document.querySelector('.car');
    const redCar = document.querySelector('.red-car');
    let isDraggingVolume = false;
    let isDraggingSpeed = false;
    // Initialize volume to 75%
    const initialVolume = 75;
    volumeSlider.value = initialVolume;
    // volumeLabel.textContent = `Volume: ${initialVolume}%`;

    // Initialize speed to 1 (normal speed) and set the range to allow for variations
    const initialSpeed = 100;
    const speedRange = { min: 50, max: 150 };
    speedSlider.min = speedRange.min;
    speedSlider.max = speedRange.max;
    speedSlider.value = initialSpeed;
    // speedLabel.textContent = `Varispeed: ${(initialSpeed / 100).toFixed(1)}`;


    // Audio context and buffer setup
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    const audioPath = "/assets/audio/sunsetBoulevard.mp3";

    async function loadAudio() {
        try {
            const response = await fetch(audioPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // Decode it
            buffer = await audioCtx.decodeAudioData(await response.arrayBuffer());
        } catch (err) {
            console.error(`Unable to fetch the audio file. Error: ${err.message}`);
        }
    }

    // Clear any existing audio elements and cache
    function clearAudioCache() {
        const existingAudio = document.getElementsByTagName('audio');
        for (let audio of existingAudio) {
            audio.pause();
            audio.src = '';
            audio.remove();
        }

        if (audioCtx) {
            audioCtx.close();
            audioCtx = null;
        }

        if (source) {
            source.stop();
            source = null;
        }
    }

    // Clear on page load
    clearAudioCache();

    // Also clear on beforeunload
    window.addEventListener('beforeunload', clearAudioCache);

    const unlockAudio = new Audio('/assets/audio/Please_Ignore_This_Audio_As_I_Needed_It_For_WebAudio_Compatibility.mp3');
    let audioUnlocked = false;

    // Disable all controls until audio is enabled
    playPauseButton.textContent = 'Enable Audio';
    stopButton.disabled = true;
    volumeSlider.disabled = true;
    speedSlider.disabled = true;

    // Block all audio functionality until properly unlocked
    function handleSliderInteraction(e) {
        if (!audioUnlocked) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Please enable audio first');
            return false;
        }
    }

    // Add blockers to sliders
    volumeSlider.addEventListener('mousedown', handleSliderInteraction, true);
    volumeSlider.addEventListener('touchstart', handleSliderInteraction, true);
    speedSlider.addEventListener('mousedown', handleSliderInteraction, true);
    speedSlider.addEventListener('touchstart', handleSliderInteraction, true);

    // Prevent scroll bounce on button clicks
    playPauseButton.addEventListener('click', async function(e) {
        // Prevent default button behavior
        e.preventDefault();
        // Prevent focus
        e.target.blur();

        if (!audioUnlocked) {
            try {
                await unlockAudio.play();
                unlockAudio.pause();
                unlockAudio.currentTime = 0;
                audioUnlocked = true;

                // Only initialize Web Audio API after proper unlock
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                gainNode = audioCtx.createGain();
                await loadAudio();

                // Enable all controls only after proper unlock
                playPauseButton.textContent = 'Play';
                stopButton.disabled = false;
                volumeSlider.disabled = false;
                speedSlider.disabled = false;
                return;
            } catch (err) {
                console.error('Audio unlock failed:', err);
                return;
            }
        }

        // Ensure audio context is created and resumed
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
        if (!buffer) {
            await loadAudio();
        }

        if (!isPlaying) {
            // Start or resume playing
            if (!source) {
                source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(gainNode).connect(audioCtx.destination);
                source.loop = true;
                source.playbackRate.value = speedSlider.value / 100;
                gainNode.gain.value = volumeSlider.value / 100;

                startTime = audioCtx.currentTime - (pauseTime || 0);
                source.start(0, pauseTime || 0);
            } else {
                startTime = audioCtx.currentTime - pauseTime;
            }

            await audioCtx.resume();
            isPlaying = true;
            playPauseButton.textContent = 'Pause';
            if (stopButton) stopButton.disabled = false;
        } else {
            // Pause
            pauseTime = audioCtx.currentTime - startTime;
            await audioCtx.suspend();
            isPlaying = false;
            playPauseButton.textContent = 'Play';
        }
    });

    stopButton.addEventListener('click', function(e) {
        // Prevent ALL default behaviors
        e.preventDefault();
        e.stopPropagation();

        // Remove focus
        this.blur();

        // Your existing stop logic
        if (source) {
            source.stop();
            source = null;
        }
        isPlaying = false;
        pauseTime = 0;
        playPauseButton.textContent = 'Play';
        stopButton.disabled = true;

        // Prevent any scrolling
        return false;
    });

    volumeSlider.addEventListener('input', function() {
        updateCarPosition(volumeSlider.value, car, 0, 100);
        if (gainNode) {
            gainNode.gain.value = volumeSlider.value / 100;
        }
        // volumeLabel.textContent = `Volume: ${volumeSlider.value}%`;
    });

    speedSlider.addEventListener('input', function(e) {
        // Add this line first - should show in console
         // Store the value
        const value = e.target.value;
        
        // Your existing working code for the car
        redCar.style.left = `${value}%`;
        
        // Your existing audio code
        if (audioElement) {
            audioElement.playbackRate = e.target.value / 100;
        }
    });


    car.addEventListener('mousedown', function(event) {
        isDraggingVolume = true;
        document.addEventListener('mousemove', onMouseMoveVolume);
        document.addEventListener('mouseup', onMouseUpVolume);
        document.addEventListener('selectstart', preventSelection); // Prevent text selection
    });

    redCar.addEventListener('mousedown', function(event) {
        isDraggingSpeed = true;
        document.addEventListener('mousemove', onMouseMoveSpeed);
        document.addEventListener('mouseup', onMouseUpSpeed);
        document.addEventListener('selectstart', preventSelection); // Prevent text selection
    });

    // Prevent slider click from moving the car
    volumeSlider.addEventListener('mousedown', function(event) {
        if (event.target !== car) {
            event.preventDefault();
        }
    });

    speedSlider.addEventListener('mousedown', function(event) {
        if (event.target !== redCar) {
            event.preventDefault();
        }
    });

    function onMouseMoveVolume(event) {
        if (!isDraggingVolume) return;
        const sliderRect = volumeSlider.getBoundingClientRect();
        let newLeft = event.clientX - sliderRect.left;
        if (newLeft < 0) newLeft = 0;
        if (newLeft > sliderRect.width) newLeft = sliderRect.width;
        const newValue = (newLeft / sliderRect.width) * 100;
        volumeSlider.value = newValue;
        updateCarPosition(newValue, car, 0, 100);
        if (gainNode) {
            gainNode.gain.value = newValue / 100;
        }
        // volumeLabel.textContent = `Volume: ${newValue.toFixed(0)}%`;
    }

    function onMouseMoveSpeed(event) {
        if (!isDraggingSpeed) return;
        const sliderRect = speedSlider.getBoundingClientRect();
        let newLeft = event.clientX - sliderRect.left;
        if (newLeft < 0) newLeft = 0;
        if (newLeft > sliderRect.width) newLeft = sliderRect.width;
        const newValue = (newLeft / sliderRect.width) * (speedRange.max - speedRange.min) + speedRange.min;
        speedSlider.value = newValue;
        updateCarPosition(newValue, redCar, speedRange.min, speedRange.max);
        if (source) {
            source.playbackRate.value = newValue / 100;
        }
        // speedLabel.textContent = `Varispeed: ${(newValue / 100).toFixed(1)}`;
    }

    function onMouseUpVolume() {
        isDraggingVolume = false;
        document.removeEventListener('mousemove', onMouseMoveVolume);
        document.removeEventListener('mouseup', onMouseUpVolume);
        document.removeEventListener('selectstart', preventSelection); // Re-enable text selection
    }

    function onMouseUpSpeed() {
        isDraggingSpeed = false;
        document.removeEventListener('mousemove', onMouseMoveSpeed);
        document.removeEventListener('mouseup', onMouseUpSpeed);
        document.removeEventListener('selectstart', preventSelection); // Re-enable text selection
    }

    function updateCarPosition(value, carElement, min, max) {
        const sliderWidth = carElement.parentElement.querySelector('input[type="range"]').offsetWidth;
        const carPosition = ((value - min) / (max - min)) * sliderWidth;
        carElement.style.left = `${carPosition}px`;
    }

    function preventSelection(event) {
        event.preventDefault();
    }

    // Initialize car positions
    updateCarPosition(initialVolume, car, 0, 100);
    updateCarPosition(initialSpeed, redCar, speedRange.min, speedRange.max);

    // Add this either inline or in your stylesheet
    playPauseButton.style.touchAction = 'none';
    stopButton.style.touchAction = 'none';

    function handleTouchMoveVolume(event) {
        if (!isDraggingVolume) return;
        event.preventDefault();

        const touch = event.touches[0];
        const sliderRect = volumeSlider.getBoundingClientRect();
        const carRect = car.getBoundingClientRect();

        // Calculate position based on car center rather than edge
        let newLeft = touch.clientX - sliderRect.left - (carRect.width / 2);
        newLeft = Math.max(0, Math.min(newLeft, sliderRect.width - carRect.width));

        // Update car position
        car.style.left = `${newLeft}px`;

        // Update slider value
        const percentage = (newLeft / (sliderRect.width - carRect.width)) * 100;
        volumeSlider.value = percentage;

        if (gainNode) {
            gainNode.gain.value = percentage / 100;
        }
    }

    // Do the same for speed slider/red car
});

