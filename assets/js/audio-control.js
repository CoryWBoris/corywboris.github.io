document.addEventListener('DOMContentLoaded', async function() {
    let audioCtx, gainNode, convolver, dryGain, wetGain,source, buffer, startTime, pauseTime, isPlaying = false, currentTime = 0, duration = 0, isDraggingTime = false, lastFrameTime = 0, pauseTimeUpdate = false, isDraggingVolume = false, isDraggingSpeed = false, isDraggingReverb = false;

    const car = document.querySelector('.car');
    const redCar = document.querySelector('.red-car');
    const greenCar = document.querySelector('.green-car');
    const purpleCar = document.querySelector('.purple-car');

    const playPauseButton = document.getElementById('playPauseButton');
    const stopButton = document.getElementById('stopButton');

    const volumeSlider = document.getElementById('volumeSlider');
    const speedSlider = document.getElementById('speedSlider');
    const reverbSlider = document.getElementById('reverbSlider');
    const timeSlider = document.getElementById('timeSlider');
    
    const volumeLabel = document.getElementById('volumeLabel');
    const speedLabel = document.getElementById('speedLabel');
    const reverbLabel = document.getElementById('reverbLabel');
    const timeLabel = document.getElementById('timeLabel');

    const initialVolume = 100;
    const volumeRange = { min: 0, max: 100 };

    const initialSpeed = 100;
    const speedRange = { min: 50, max: 150 };
    
    const initialReverb = 0;
    const reverbRange = { min: 0, max: 100 };
    
    const initialTime = 0;
    const timeRange = { min: 0, max: 100 };

    
    // Add SVG loading verification at the start
    function waitForSVGs() {
        return new Promise((resolve, reject) => {

            let attempts = 0;
            const checkSVGs = setInterval(() => {
                if (car?.offsetWidth > 0 && redCar?.offsetWidth > 0 && greenCar?.offsetWidth > 0) {
                    clearInterval(checkSVGs);
                    resolve();
                } else if (attempts >= 50) { // 5 seconds timeout
                    clearInterval(checkSVGs);
                    reject(new Error('SVG loading timeout'));
                }
                attempts++;
            }, 100);
        });
    }

    try {
        await waitForSVGs();
    } catch (error) {
        console.error('Failed to load SVGs:', error);
        location.reload(); // Automatically reload once if SVGs fail to load
        return;
    }

    // Rest of your existing code starts here
    function scrollPastHeader() {
        const header = document.querySelector('header');
        if (header && 'ontouchstart' in window) {
            window.scrollTo(0, header.offsetHeight);
        }
    }

    scrollPastHeader();



    volumeSlider.min = volumeRange.min;
    volumeSlider.max = volumeRange.max;
    volumeSlider.value = initialVolume;


    reverbSlider.min = reverbRange.min;
    reverbSlider.max = reverbRange.max;
    reverbSlider.value = initialReverb;
    // reverbLabel.textContent = `Reverb: ${initialReverb}%`;

    speedSlider.min = speedRange.min;
    speedSlider.max = speedRange.max;
    speedSlider.value = initialSpeed;
    // speedLabel.textContent = `Varispeed: ${(initialSpeed / 100).toFixed(1)}`;

    // Add with other slider initializations
    timeSlider.min = timeRange.min;
    timeSlider.max = timeRange.max;
    timeSlider.value = initialTime;

    // Audio context and buffer setup
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    convolver = audioCtx.createConvolver();

    // Add this after creating the convolver
    async function createImpulseResponse() {
        const length = audioCtx.sampleRate * 2.0; // 2 second impulse
        const impulseBuffer = audioCtx.createBuffer(2, length, audioCtx.sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulseBuffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }

        convolver.buffer = impulseBuffer;
    }

    const audioPath = "/assets/audio/sunsetBoulevard.mp3";

    async function loadAudio() {
        try {
            const response = await fetch(audioPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            buffer = await audioCtx.decodeAudioData(await response.arrayBuffer());
            duration = buffer.duration;
            timeSlider.max = duration;
            timeRange.max = duration;
            updateCarPosition(initialTime, purpleCar, timeRange.min, timeRange.max);
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
    reverbSlider.disabled = true;
    timeSlider.disabled = true;
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
    reverbSlider.addEventListener('mousedown', handleSliderInteraction, true);
    reverbSlider.addEventListener('touchstart', handleSliderInteraction, true);
    timeSlider.addEventListener('mousedown', handleSliderInteraction, true);
    timeSlider.addEventListener('touchstart', handleSliderInteraction, true);

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
                convolver = audioCtx.createConvolver();
                await createImpulseResponse();
                await loadAudio();

                // Enable all controls only after proper unlock
                playPauseButton.textContent = 'Play';
                stopButton.disabled = false;
                volumeSlider.disabled = false;
                speedSlider.disabled = false;
                reverbSlider.disabled = false;
                timeSlider.disabled = false;
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

                // create a dry/wet mix
                dryGain = audioCtx.createGain();
                wetGain = audioCtx.createGain();

                // Connect source to both paths
                source.connect(dryGain);
                source.connect(convolver);
                convolver.connect(wetGain);

                // Connect both paths to main gain
                dryGain.connect(gainNode);
                wetGain.connect(gainNode);

                gainNode.connect(audioCtx.destination);

                // Set initial mix
                dryGain.gain.value = 1 - (reverbSlider.value / 100);
                wetGain.gain.value = reverbSlider.value / 100;
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
            
            // Start the time display update
            requestAnimationFrame(updateTimeDisplay);
        } else {
            // Pause
            pauseTime = audioCtx.currentTime - startTime;
            await audioCtx.suspend();
            isPlaying = false;
            playPauseButton.textContent = 'Play';
        }
    });

    stopButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.blur();

        if (source) {
            source.stop();
            source = null;
        }

        // Reset audio nodes to ensure clean state
        if (dryGain) {
            dryGain.disconnect();
            dryGain = null;
        }
        if (wetGain) {
            wetGain.disconnect();
            wetGain = null;
        }
        if (convolver) {
            convolver.disconnect();
        }
        if (gainNode) {
            gainNode.disconnect();
        }

        isPlaying = false;
        pauseTime = 0;
        currentTime = 0;
        timeSlider.value = 0;
        updateCarPosition(0, purpleCar, timeRange.min, timeRange.max);
        
        playPauseButton.textContent = 'Play';
        stopButton.disabled = true;

        return false;
    });

    volumeSlider.addEventListener('input', function() {
        updateCarPosition(volumeSlider.value, car, volumeRange.min, volumeRange.max);
        if (gainNode) {
            gainNode.gain.value = volumeSlider.value / 100;
        }
        // volumeLabel.textContent = `Volume: ${volumeSlider.value}%`;
    });

    speedSlider.addEventListener('input', function(e) {
        updateCarPosition(speedSlider.value, redCar, speedRange.min, speedRange.max);
        if (source) {
            source.playbackRate.value = speedSlider.value / 100;
        }
        // speedLabel.textContent = `Varispeed: ${(speedSlider.value / 100).toFixed(1)}`;
    });

    reverbSlider.addEventListener('input', function() {
        updateCarPosition(reverbSlider.value, greenCar, reverbRange.min, reverbRange.max);

        const wetAmount = reverbSlider.value / 100;

        if (source && dryGain && wetGain) {
            // Normal playing state
            wetGain.gain.value = wetAmount;
            dryGain.gain.value = 1 - wetAmount;
        } else if (convolver && gainNode) {
            // Stopped state with hanging reverb
            // Create temporary gain nodes if needed
            if (!wetGain) {
                wetGain = audioCtx.createGain();
                convolver.connect(wetGain);
                wetGain.connect(gainNode);
            }
            if (!dryGain) {
                dryGain = audioCtx.createGain();
                dryGain.connect(gainNode);
            }
            
            wetGain.gain.value = wetAmount;
            dryGain.gain.value = 1 - wetAmount;
        }
    });
    
    timeSlider.addEventListener('input', function(event) {
        const newTime = parseFloat(event.target.value);
        currentTime = newTime;
        
        // Update timing variables
        startTime = audioCtx.currentTime - (newTime / (speedSlider.value / 100));
        lastFrameTime = audioCtx.currentTime;
        
        updateCarPosition(newTime, purpleCar, timeRange.min, timeRange.max);
        
        if (source && isPlaying) {
            const currentSpeed = speedSlider.value / 100;
            source.stop();
            source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = currentSpeed;
            
            // Reconnect all nodes
            source.connect(dryGain);
            source.connect(convolver);
            
            // Start at the new time
            source.start(0, newTime);
            
            // Request next animation frame
            requestAnimationFrame(updateTimeDisplay);
        } else {
            pauseTime = newTime;
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

    greenCar.addEventListener('mousedown', function(event) {
        isDraggingReverb = true;
        document.addEventListener('mousemove', onMouseMoveReverb);
        document.addEventListener('mouseup', onMouseUpReverb);
        document.addEventListener('selectstart', preventSelection); // Prevent text selection
    });
    purpleCar.addEventListener('mousedown', function(event) {
        isDraggingTime = true;
        document.addEventListener('mousemove', onMouseMoveTime);
        document.addEventListener('mouseup', onMouseUpTime);
        document.addEventListener('selectstart', preventSelection);
        event.preventDefault();
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
    reverbSlider.addEventListener('mousedown', function(event) {
        if (event.target !== greenCar) {
            event.preventDefault();
        }
    });

    timeSlider.addEventListener('mousedown', function(event) {
        if (event.target !== purpleCar) {
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

    function onMouseMoveReverb(event) {
        if (!isDraggingReverb) return;
        const sliderRect = reverbSlider.getBoundingClientRect();
        let newLeft = event.clientX - sliderRect.left;
        if (newLeft < 0) newLeft = 0;
        if (newLeft > sliderRect.width) newLeft = sliderRect.width;
        const newValue = (newLeft / sliderRect.width) * 100;
        reverbSlider.value = newValue;
        updateCarPosition(newValue, greenCar, reverbRange.min, reverbRange.max);
        if (dryGain && wetGain) {  // Changed from convolver
            const wetAmount = newValue / 100;
            wetGain.gain.value = wetAmount;
            dryGain.gain.value = 1 - wetAmount;
        }
        // reverbLabel.textContent = `Reverb: ${newValue.toFixed(0)}%`;
    }
    function onMouseMoveTime(event) {
        if (!isDraggingTime) return;
        event.preventDefault();
        
        const sliderRect = timeSlider.getBoundingClientRect();
        const carRect = purpleCar.getBoundingClientRect();
        
        // Calculate new position within bounds
        let newLeft = event.clientX - sliderRect.left - (carRect.width / 2);
        newLeft = Math.max(0, Math.min(newLeft, sliderRect.width - carRect.width));
        
        // Calculate time based on position relative to total duration
        const percentage = newLeft / (sliderRect.width - carRect.width);
        const newTime = percentage * duration;
        
        // Update times
        currentTime = newTime;
        startTime = audioCtx.currentTime - (newTime / (speedSlider.value / 100));
        lastFrameTime = audioCtx.currentTime;
        
        // Update slider and car position
        timeSlider.value = newTime;
        updateCarPosition(newTime, purpleCar, timeRange.min, timeRange.max);
        
        // Update audio playback position without stopping
        if (isPlaying) {
            if (source) {
                source.stop();
                source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.playbackRate.value = speedSlider.value / 100;
                source.connect(dryGain);
                source.connect(convolver);
                source.start(0, newTime);
            }
        } else {
            pauseTime = newTime;
        }
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

    function onMouseUpReverb() {
        isDraggingReverb = false;
        document.removeEventListener('mousemove', onMouseMoveReverb);
        document.removeEventListener('mouseup', onMouseUpReverb);
        document.removeEventListener('selectstart', preventSelection); // Re-enable text selection
    }

    function onMouseUpTime() {
        isDraggingTime = false;
        lastFrameTime = audioCtx.currentTime;
        
        // Immediately request a new animation frame to continue movement
        if (isPlaying) {
            requestAnimationFrame(updateTimeDisplay);
        }
        
        document.removeEventListener('mousemove', onMouseMoveTime);
        document.removeEventListener('mouseup', onMouseUpTime);
        document.removeEventListener('selectstart', preventSelection);
    }

    function updateCarPosition(value, carElement, min, max) {
        const sliderWidth = carElement.parentElement.querySelector('input[type="range"]').offsetWidth;
        const carWidth = carElement.offsetWidth;  // Get the car's width

        // Adjust the available travel distance by subtracting the car width
        const adjustedWidth = sliderWidth - carWidth;

        // Calculate position as a percentage of the adjusted width
        const carPosition = ((value - min) / (max - min)) * adjustedWidth;

        carElement.style.left = `${carPosition}px`;
    }

    function preventSelection(event) {
        event.preventDefault();
    }

    // Initialize car positions
    updateCarPosition(initialVolume, car, volumeRange.min, volumeRange.max);
    updateCarPosition(initialSpeed, redCar, speedRange.min, speedRange.max);
    updateCarPosition(initialReverb, greenCar, reverbRange.min, reverbRange.max);
    updateCarPosition(initialTime, purpleCar, timeRange.min, timeRange.max);
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
    function handleTouchMoveSpeed(event) {
        if (!isDraggingSpeed) return;
        event.preventDefault();
        
        const touch = event.touches[0];
        const sliderRect = speedSlider.getBoundingClientRect();
        const carRect = redCar.getBoundingClientRect();

        let newLeft = touch.clientX - sliderRect.left - (carRect.width / 2);
        newLeft = Math.max(0, Math.min(newLeft, sliderRect.width - carRect.width));

        // Update car position
        redCar.style.left = `${newLeft}px`;

        // Update slider value
        const percentage = (newLeft / (sliderRect.width - carRect.width)) * 100;
        speedSlider.value = percentage;

        if (source) {
            source.playbackRate.value = percentage / 100;
        }
    }
    
    function handleTouchMoveReverb(event) {
        if (!isDraggingReverb) return;
        event.preventDefault();
        
        const touch = event.touches[0];
        const sliderRect = reverbSlider.getBoundingClientRect();
        const carRect = greenCar.getBoundingClientRect();
        
        let newLeft = touch.clientX - sliderRect.left - (carRect.width / 2);
        newLeft = Math.max(0, Math.min(newLeft, sliderRect.width - carRect.width));

        // Update car position
        greenCar.style.left = `${newLeft}px`;

        // Update slider value
        const percentage = (newLeft / (sliderRect.width - carRect.width)) * 100;
        reverbSlider.value = percentage;

        if (dryGain && wetGain) {  // Changed from convolver
            const wetAmount = percentage / 100;
            wetGain.gain.value = wetAmount;
            dryGain.gain.value = 1 - wetAmount;
        }
    }
    
    function handleTouchMoveTime(event) {
        if (!isDraggingTime) return;
        event.preventDefault();

        const touch = event.touches[0];
        const sliderRect = timeSlider.getBoundingClientRect();
        const carRect = purpleCar.getBoundingClientRect();

        let newLeft = touch.clientX - sliderRect.left - (carRect.width / 2);
        newLeft = Math.max(0, Math.min(newLeft, sliderRect.width - carRect.width));

        const percentage = newLeft / (sliderRect.width - carRect.width);
        const newTime = percentage * duration;

        timeSlider.value = newTime;
        updateCarPosition(newTime, purpleCar, timeRange.min, timeRange.max);

        if (source && isPlaying) {
            source.stop();
            startTime = audioCtx.currentTime - newTime;
            createAndStartSource();
        } else {
            pauseTime = newTime;
        }
    }

    function updateTimeDisplay() {
        if (source && isPlaying && !pauseTimeUpdate) {  // Add check for pauseTimeUpdate
            // Get current speed from red car (always positive)
            const speedPercentage = speedSlider.value;
            const currentSpeed = speedPercentage / 100;
            
            // Calculate time elapsed since last frame
            const now = audioCtx.currentTime;
            const frameDelta = now - lastFrameTime;
            lastFrameTime = now;
            
            // Add the time increment (always moving forward)
            currentTime += frameDelta * currentSpeed;
            
            // If we've reached the end, loop back to start
            if (currentTime >= duration) {
                currentTime = 0;
                startTime = audioCtx.currentTime;
                
                // Stop current source
                source.stop();
                
                // Create and start new source
                source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.loop = true;
                source.playbackRate.value = currentSpeed;
                
                // Reconnect all audio nodes
                source.connect(dryGain);
                source.connect(convolver);
                source.start(0);
            }
            
            // Update slider and car position
            timeSlider.value = currentTime;
            updateCarPosition(currentTime, purpleCar, timeRange.min, timeRange.max);
            
            // Always continue updating while playing
            requestAnimationFrame(updateTimeDisplay);
        }
    }
});









