document.addEventListener('DOMContentLoaded', async function() {
    let audioCtx, gainNode, convolver, dryGain, wetGain, source, buffer, startTime, pauseTime, isPlaying = false, currentTime = 0, duration = 0, isDraggingTime = false, lastFrameTime = 0, pauseTimeUpdate = false, isDraggingVolume = false, isDraggingSpeed = false, isDraggingReverb = false, isReversed = false;

    const car = document.querySelector('.car');
    const redCar = document.querySelector('.red-car');
    const greenCar = document.querySelector('.green-car');
    const purpleCar = document.querySelector('.purple-car');
    const reverseButton = document.getElementById('reverseButton');

    const playPauseButton = document.getElementById('playPauseButton');
    const stopButton = document.getElementById('stopButton');
    // Now we can safely add the visibility change handler
    document.addEventListener('visibilitychange', function() {
        if (document.hidden && isPlaying) {
            playPauseButton.click();
        }
    });
    

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

    let timeUpdateInterval;

    // Add wave animation handler
    playPauseButton.addEventListener('click', async function(e) {
        e.preventDefault();
        e.target.blur();

        if (!audioUnlocked) {
            playPauseButton.innerHTML = '';
            
            const waveText = document.createElement('div');
            waveText.className = 'wave-text';
            
            'Enabling Audio'.split('').forEach(letter => {
                const span = document.createElement('span');
                span.textContent = letter === ' ' ? '\u00A0' : letter;
                waveText.appendChild(span);
            });
            
            playPauseButton.appendChild(waveText);
            
            // Wait for the first animation to start before adding the enabling class
            waveText.firstChild.addEventListener('animationstart', () => {
                playPauseButton.classList.add('enabling');
            }, { once: true });
        }
    });

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

    const unlockAudio = new Audio('/assets/audio/a.wav');
    let audioUnlocked = false;

    // Disable all controls until audio is enabled
    playPauseButton.textContent = 'Enable Audio';
    stopButton.disabled = true;
    volumeSlider.disabled = true;
    speedSlider.disabled = true;
    reverbSlider.disabled = true;
    timeSlider.disabled = true;
    if (reverseButton) {
        reverseButton.disabled = true;
    }
    // Block all audio functionality until properly unlocked
    function handleSliderInteraction(e) {
        if (!audioUnlocked) {
            e.preventDefault();
            e.stopPropagation();
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
        e.preventDefault();
        e.target.blur();

        if (!audioUnlocked) {
            // Start enabling animation
            playPauseButton.classList.add('enabling');
            
            try {
                // Wait for audio initialization
                await unlockAudio.play();
                unlockAudio.pause();
                unlockAudio.currentTime = 0;
                audioUnlocked = true;

                // Initialize Web Audio API
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                gainNode = audioCtx.createGain();
                convolver = audioCtx.createConvolver();
                await createImpulseResponse();
                await loadAudio();

                // Let the loading animation play for a moment before changing state
                setTimeout(() => {
                    playPauseButton.classList.remove('enabling');
                    playPauseButton.innerHTML = 'Play';
                    
                    // Enable all controls
                    stopButton.disabled = false;
                    volumeSlider.disabled = false;
                    speedSlider.disabled = false;
                    reverbSlider.disabled = false;
                    timeSlider.disabled = false;
                    if (reverseButton) {
                        reverseButton.disabled = false;
                    }
                }, 2000);

                return;
            } catch (err) {
                console.error('Audio unlock failed:', err);
                return;
            }
        }

        // Check if we're at the relative end and not playing
        if (!isPlaying && ((currentTime >= duration && !isReversed) || (currentTime <= 0 && isReversed))) {
            // Reset to relative beginning before starting
            currentTime = isReversed ? duration : 0;
            timeSlider.value = currentTime;
            updateCarPosition(currentTime, purpleCar, timeRange.min, timeRange.max);
        }

        if (!isPlaying) {
            // Complete cleanup before starting new playback
            if (source) {
                try {
                    source.stop();
                } catch (e) {
                    // Ignore errors if source was already stopped
                }
                source.disconnect();
                source = null;
            }
            
            // Ensure all nodes are properly disconnected
            [dryGain, wetGain, convolver, gainNode].forEach(node => {
                if (node) {
                    node.disconnect();
                }
            });

            // Create fresh nodes with a small fade-in
            gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(volumeSlider.value / 100, audioCtx.currentTime + 0.005);

            convolver = audioCtx.createConvolver();
            await createImpulseResponse();
            
            dryGain = audioCtx.createGain();
            wetGain = audioCtx.createGain();

            // Create and configure source
            source = audioCtx.createBufferSource();
            source.buffer = isReversed ? reverseBuffer(buffer) : buffer;
            
            // Connect nodes
            source.connect(dryGain);
            source.connect(convolver);
            convolver.connect(wetGain);
            dryGain.connect(gainNode);
            wetGain.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Set parameters
            dryGain.gain.value = 1 - (reverbSlider.value / 100);
            wetGain.gain.value = reverbSlider.value / 100;
            source.playbackRate.value = speedSlider.value / 100;

            // Start playback with precise timing
            const startOffset = isReversed ? duration - currentTime : currentTime;
            startTime = audioCtx.currentTime - currentTime;
            lastFrameTime = audioCtx.currentTime;
            source.start(audioCtx.currentTime, startOffset);

            await audioCtx.resume();
            isPlaying = true;
            playPauseButton.textContent = 'Pause';
            if (stopButton) stopButton.disabled = false;
            
            requestAnimationFrame(updateTimeDisplay);
        } else {
            // Pause with fade-out
            if (gainNode) {
                gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.005);
            }
            
            setTimeout(() => {
                if (source) {
                    source.stop();
                    source.disconnect();
                    source = null;
                }
                audioCtx.suspend();
            }, 10);

            pauseTime = audioCtx.currentTime - startTime;
            isPlaying = false;
            playPauseButton.textContent = 'Play';
        }
    });

    stopButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.blur();

        if (isPlaying) {
            // Act as pause button if playing
            if (source) {
                pauseTime = audioCtx.currentTime - startTime;
                audioCtx.suspend();
                isPlaying = false;
                playPauseButton.textContent = 'Play';
            }
        } else {
            // Second stop - reset everything
            if (source) {
                source.stop();
                source.disconnect();  // Disconnect source first
                if (dryGain) dryGain.disconnect();
                if (wetGain) wetGain.disconnect();
                if (convolver) convolver.disconnect();
                if (gainNode) gainNode.disconnect();
                source = null;  // Then null the source
            }
            
            // Reset to the appropriate end based on current reverse state
            if (isReversed) {
                currentTime = duration;
                timeSlider.value = duration;
                updateCarPosition(duration, purpleCar, timeRange.min, timeRange.max);
                pauseTime = duration;
                document.querySelector('.time-label').textContent = formatTime(duration);
            } else {
                currentTime = 0;
                timeSlider.value = 0;
                updateCarPosition(0, purpleCar, timeRange.min, timeRange.max);
                pauseTime = 0;
                document.querySelector('.time-label').textContent = '0:00';
            }
        }

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
        
        // Keep visual updates
        updateCarPosition(newTime, purpleCar, timeRange.min, timeRange.max);
        document.querySelector('.time-label').textContent = formatTime(newTime);
        
        if (source && isPlaying) {
            // Just stop the source during scrubbing
            source.stop();
            source = null;
        }
        
        pauseTime = newTime;
    });

    // Add this to resume playback when scrubbing ends
    timeSlider.addEventListener('change', function(event) {
        if (isPlaying) {
            const newTime = parseFloat(event.target.value);
            source = audioCtx.createBufferSource();
            source.buffer = isReversed ? reverseBuffer(buffer) : buffer;
            source.playbackRate.value = speedSlider.value / 100;
            
            source.connect(dryGain);
            source.connect(convolver);
            
            const startPosition = isReversed ? duration - newTime : newTime;
            source.start(0, startPosition);
            
            requestAnimationFrame(updateTimeDisplay);
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
        
        // Start continuous time updates
        timeUpdateInterval = setInterval(() => {
            if (isDraggingTime) {
                document.querySelector('.time-label').textContent = formatTime(currentTime);
            }
        }, 16); // approximately 60fps
        
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
        
        let newLeft = event.clientX - sliderRect.left - (carRect.width / 2);
        newLeft = Math.max(0, Math.min(newLeft, sliderRect.width - carRect.width));
        
        const percentage = newLeft / (sliderRect.width - carRect.width);
        const newTime = percentage * duration;
        
        // Update times
        currentTime = newTime;
        timeSlider.value = newTime;
        updateCarPosition(newTime, purpleCar, timeRange.min, timeRange.max);
        
        // Update time label continuously
        document.querySelector('.time-label').textContent = formatTime(newTime);
        
        // Stop audio completely during scrubbing
        if (source) {
            source.stop();
            source.disconnect();
            source = null;
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
        if (!isDraggingTime) return;
        
        // Immediately clear flags and intervals
        isDraggingTime = false;
        if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
            timeUpdateInterval = null;
        }
        
        // Immediately remove event listeners
        document.removeEventListener('mousemove', onMouseMoveTime);
        document.removeEventListener('mouseup', onMouseUpTime);
        document.removeEventListener('selectstart', preventSelection);
        
        // Only handle audio if we were playing
        if (isPlaying) {
            lastFrameTime = audioCtx.currentTime;
            startTime = audioCtx.currentTime - currentTime;
            
            // Create and start new source in one go
            source = audioCtx.createBufferSource();
            source.buffer = isReversed ? reverseBuffer(buffer) : buffer;
            source.playbackRate.value = speedSlider.value / 100;
            source.connect(dryGain);
            source.connect(convolver);
            
            const startPosition = isReversed ? duration - currentTime : currentTime;
            source.start(0, startPosition);
            
            requestAnimationFrame(updateTimeDisplay);
        }
    }

    function updateCarPosition(value, carElement, min, max) {
        const slider = carElement.parentElement.querySelector('input[type="range"]');
        const sliderWidth = slider.offsetWidth;
        const carWidth = carElement.offsetWidth;
    
        // Ensure value is within bounds
        value = Math.max(min, Math.min(max, value));
        
        // Adjust the available travel distance by subtracting the car width
        const adjustedWidth = sliderWidth - 1.5*carWidth;
    
        // Calculate position as a percentage of the adjusted width
        const carPosition = Math.round(((value - min) / (max - min)) * adjustedWidth + carWidth/3.8);
    
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
        
        let newLeft = touch.clientX - sliderRect.left - (carRect.width / 2);
        newLeft = Math.max(0, Math.min(newLeft, sliderRect.width - carRect.width));

        // Update slider value
        const percentage = (newLeft / (sliderRect.width - carRect.width)) * 100;
        volumeSlider.value = percentage;

        // Update car position
        updateCarPosition(percentage, car, volumeRange.min, volumeRange.max);

        // Update audio
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

        // Update slider value
        const percentage = (newLeft / (sliderRect.width - carRect.width)) * 
                          (speedRange.max - speedRange.min) + speedRange.min;
        speedSlider.value = percentage;

        // Update car position
        updateCarPosition(percentage, redCar, speedRange.min, speedRange.max);

        // Update playback speed
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

        // Update slider value
        const percentage = (newLeft / (sliderRect.width - carRect.width)) * 100;
        reverbSlider.value = percentage;

        // Update car position
        updateCarPosition(percentage, greenCar, reverbRange.min, reverbRange.max);

        // Update reverb
        if (wetGain && dryGain) {
            wetGain.gain.value = percentage / 100;
            dryGain.gain.value = 1 - (percentage / 100);
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

        // Update times
        currentTime = newTime;
        timeSlider.value = newTime;
        updateCarPosition(newTime, purpleCar, timeRange.min, timeRange.max);
        document.querySelector('.time-label').textContent = formatTime(newTime);

        // Don't pause time updates while dragging if playing
        if (isPlaying) {
            startTime = audioCtx.currentTime - newTime;
            lastFrameTime = audioCtx.currentTime;
        }
    }

    function handleTouchEndTime() {
        if (!isDraggingTime) return;
        
        isDraggingTime = false;
        lastFrameTime = audioCtx.currentTime;
        
        // Clean up listeners
        document.removeEventListener('touchmove', handleTouchMoveTime);
        document.removeEventListener('touchend', handleTouchEndTime);
        document.removeEventListener('touchcancel', handleTouchEndTime);
        
        if (isPlaying) {
            // Update the playback position
            startTime = audioCtx.currentTime - currentTime;
            
            // Restart the source from the new position
            if (source) {
                source.stop();
                source = audioCtx.createBufferSource();
                source.buffer = isReversed ? reverseBuffer(buffer) : buffer;
                source.playbackRate.value = speedSlider.value / 100;
                source.connect(dryGain);
                source.connect(convolver);
                
                const startPosition = isReversed ? duration - currentTime : currentTime;
                source.start(0, startPosition);
            }
            
            // Resume animation
            requestAnimationFrame(updateTimeDisplay);
        }
    }

    // Keep only this touchstart listener
    purpleCar.addEventListener('touchstart', function(event) {
        isDraggingTime = true;
        document.addEventListener('touchmove', handleTouchMoveTime, { passive: false });
        document.addEventListener('touchend', handleTouchEndTime);
        document.addEventListener('touchcancel', handleTouchEndTime);
        
        // Add continuous time updates like in mousedown
        timeUpdateInterval = setInterval(() => {
            if (isDraggingTime) {
                document.querySelector('.time-label').textContent = formatTime(currentTime);
            }
        }, 16); // approximately 60fps
        
        event.preventDefault();
    });

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function updateTimeDisplay() {
        if (source && isPlaying && !pauseTimeUpdate) {
            const now = audioCtx.currentTime;
            const elapsed = now - lastFrameTime;
            lastFrameTime = now;

            const speed = speedSlider.value / 100;
            
            if (isReversed) {
                currentTime = Math.max(0, currentTime - (elapsed * speed));
                if (currentTime <= 0) {
                    currentTime = 0;
                    if (source) {
                        source.stop();
                        source = null;
                    }
                    isPlaying = false;
                    playPauseButton.textContent = 'Play';
                    timeSlider.value = 0;
                    updateCarPosition(0, purpleCar, timeRange.min, timeRange.max);
                    document.querySelector('.time-label').textContent = '0:00';
                }
            } else {
                currentTime = Math.min(duration, currentTime + (elapsed * speed));
                if (currentTime >= duration) {
                    currentTime = duration;
                    if (source) {
                        source.stop();
                        source = null;
                    }
                    isPlaying = false;
                    playPauseButton.textContent = 'Play';
                    timeSlider.value = duration;
                    updateCarPosition(duration, purpleCar, timeRange.min, timeRange.max);
                    document.querySelector('.time-label').textContent = formatTime(duration);
                }
            }

            timeSlider.value = currentTime;
            updateCarPosition(currentTime, purpleCar, timeRange.min, timeRange.max);
            document.querySelector('.time-label').textContent = formatTime(currentTime);

            if (isPlaying) {
                requestAnimationFrame(updateTimeDisplay);
            }
        }
    }

    // Add this helper function
    function stopPlayback() {
        if (source) {
            source.stop();
            source = null;
        }
        isPlaying = false;
        playPauseButton.textContent = 'Play';
        
        // Disconnect nodes
        if (dryGain) dryGain.disconnect();
        if (wetGain) wetGain.disconnect();
        if (convolver) convolver.disconnect();
        if (gainNode) gainNode.disconnect();
        
        // Reset to start if we reached the end (but not if we're in reverse and reached the start)
        if (!isReversed && currentTime >= duration) {
            currentTime = 0;
            timeSlider.value = 0;
            updateCarPosition(0, purpleCar, timeRange.min, timeRange.max);
        }
        
        pauseTime = currentTime;
    }

    // Add this helper function to reverse the audio buffer
    function reverseBuffer(buffer) {
        const channels = buffer.numberOfChannels;
        // Create a new buffer with same properties
        const reversedBuffer = audioCtx.createBuffer(
            channels,
            buffer.length,
            buffer.sampleRate
        );
        
        // Reverse the data of each channel
        for (let channel = 0; channel < channels; channel++) {
            const channelData = buffer.getChannelData(channel);
            const reversedData = reversedBuffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                reversedData[i] = channelData[channelData.length - 1 - i];
            }
        }
        return reversedBuffer;
    }

    // Fix the reverse button handler
    reverseButton.addEventListener('click', async function(e) {
        e.preventDefault();
        e.target.blur();
        
        isReversed = !isReversed;
        reverseButton.textContent = isReversed ? 'Forwards' : 'Backwards';
        reverseButton.style.transform = isReversed ? 'none' : 'scaleX(-1)';
        purpleCar.classList.toggle('reversed', isReversed);
        
        // Reset drag-related states
        isDraggingTime = false;
        pauseTimeUpdate = false;
        if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
            timeUpdateInterval = null;
        }
        
        if (isPlaying) {
            const currentPosition = currentTime;
            
            if (source) {
                source.stop();
                source = null;
            }
            
            source = audioCtx.createBufferSource();
            source.buffer = isReversed ? reverseBuffer(buffer) : buffer;
            source.playbackRate.value = speedSlider.value / 100;
            
            source.connect(dryGain);
            source.connect(convolver);
            
            const startPosition = isReversed ? duration - currentPosition : currentPosition;
            source.start(0, startPosition);
            
            startTime = audioCtx.currentTime - currentPosition;
            lastFrameTime = audioCtx.currentTime;
            
            requestAnimationFrame(updateTimeDisplay);
        } else {
            // Force source recreation on next play
            if (source) {
                source.disconnect();
                source = null;
            }
            
            // Simply maintain current position without any jumping
            const currentPosition = currentTime;
            pauseTime = currentPosition;
            timeSlider.value = currentPosition;
            updateCarPosition(currentPosition, purpleCar, timeRange.min, timeRange.max);
        }
    });

    // Add this CSS to fix the button click issue
    reverseButton.style.position = 'relative';
    reverseButton.style.zIndex = '1000';

    function cleanupAudioNodes() {
        // Stop and disconnect source if it exists
        if (source) {
            source.stop();
            source.disconnect();
            source = null;
        }
        
        // Disconnect all effect/routing nodes
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
            convolver = null;
        }
        if (gainNode) {
            gainNode.disconnect();
            gainNode = null;
        }
        
        // Recreate the permanent nodes
        gainNode = audioCtx.createGain();
        convolver = audioCtx.createConvolver();
        createImpulseResponse(); // Recreate the impulse response
    }

    // Add touchend handler to properly maintain reversed state
    purpleCar.addEventListener('touchend', function() {
        isDraggingTime = false;
        lastFrameTime = audioCtx.currentTime;
        
        if (isPlaying) {
            // Ensure we're using the correct buffer direction when resuming playback
            if (source) {
                source.stop();
                source = audioCtx.createBufferSource();
                source.buffer = isReversed ? reverseBuffer(buffer) : buffer;
                source.playbackRate.value = speedSlider.value / 100;
                source.connect(dryGain);
                source.connect(convolver);
                
                const startPosition = isReversed ? duration - currentTime : currentTime;
                source.start(0, startPosition);
                startTime = audioCtx.currentTime - currentTime;
                lastFrameTime = audioCtx.currentTime;
            }
            requestAnimationFrame(updateTimeDisplay);
        }
    });

    purpleCar.addEventListener('touchstart', function(event) {
        isDraggingTime = true;
        document.addEventListener('touchmove', handleTouchMoveTime, { passive: false });
        document.addEventListener('touchend', handleTouchEndTime);
        document.addEventListener('touchcancel', handleTouchEndTime);
        event.preventDefault();
    });

    // Add this to your existing JS
    // Add these alongside your existing event listeners
    car.addEventListener('touchstart', function(event) {
        isDraggingVolume = true;
        document.addEventListener('touchmove', handleTouchMoveVolume, { passive: false });
        document.addEventListener('touchend', handleTouchEndVolume);
        document.addEventListener('touchcancel', handleTouchEndVolume);
        event.preventDefault();
    });

    redCar.addEventListener('touchstart', function(event) {
        isDraggingSpeed = true;
        document.addEventListener('touchmove', handleTouchMoveSpeed, { passive: false });
        document.addEventListener('touchend', handleTouchEndSpeed);
        document.addEventListener('touchcancel', handleTouchEndSpeed);
        event.preventDefault();
    });

    greenCar.addEventListener('touchstart', function(event) {
        isDraggingReverb = true;
        document.addEventListener('touchmove', handleTouchMoveReverb, { passive: false });
        document.addEventListener('touchend', handleTouchEndReverb);
        document.addEventListener('touchcancel', handleTouchEndReverb);
        event.preventDefault();
    });

    function handleTouchEndVolume() {
        isDraggingVolume = false;
        document.removeEventListener('touchmove', handleTouchMoveVolume);
        document.removeEventListener('touchend', handleTouchEndVolume);
        document.removeEventListener('touchcancel', handleTouchEndVolume);
    }

    function handleTouchEndSpeed() {
        isDraggingSpeed = false;
        document.removeEventListener('touchmove', handleTouchMoveSpeed);
        document.removeEventListener('touchend', handleTouchEndSpeed);
        document.removeEventListener('touchcancel', handleTouchEndSpeed);
    }

    function handleTouchEndReverb() {
        isDraggingReverb = false;
        document.removeEventListener('touchmove', handleTouchMoveReverb);
        document.removeEventListener('touchend', handleTouchEndReverb);
        document.removeEventListener('touchcancel', handleTouchEndReverb);
    }

    // Add this function to handle orientation/resize changes
    function reinitializeCarPositions() {
        // Small delay to ensure new dimensions are calculated
        setTimeout(() => {
            updateCarPosition(volumeSlider.value, car, volumeRange.min, volumeRange.max);
            updateCarPosition(speedSlider.value, redCar, speedRange.min, speedRange.max);
            updateCarPosition(reverbSlider.value, greenCar, reverbRange.min, reverbRange.max);
            updateCarPosition(timeSlider.value, purpleCar, timeRange.min, timeRange.max);
        }, 100);
    }

    // Listen for orientation changes
    window.addEventListener('orientationchange', reinitializeCarPositions);

    // Also use ResizeObserver as a fallback for devices that don't support orientationchange
    const resizeObserver = new ResizeObserver((entries) => {
        const oldWidth = entries[0].target.clientWidth;
        // Wait for next frame to check if width actually changed
        requestAnimationFrame(() => {
            const newWidth = entries[0].target.clientWidth;
            if (oldWidth !== newWidth) {
                reinitializeCarPositions();
            }
        });
    });

    // Observe the container that holds the sliders
    resizeObserver.observe(document.querySelector('.audio-container'));

    // Add this function to handle landscape scrolling
    function handleOrientationScroll() {
        if (window.matchMedia("(orientation: landscape)").matches) {
            const controlContainer = document.querySelector('.control-container');
            if (controlContainer) {
                // Get the position of the control container
                const rect = controlContainer.getBoundingClientRect();
                const scrollPosition = window.pageYOffset + rect.top - 5;  // 20px gap above buttons
                
                // Scroll to position with the gap
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'smooth'
                });
            }
        }
    }

    // Call it when orientation changes
    window.addEventListener('orientationchange', () => {
        // Small delay to ensure DOM has updated
        setTimeout(handleOrientationScroll, 100);
    });

    // Also call it on initial load if we're already in landscape
    document.addEventListener('DOMContentLoaded', () => {
        handleOrientationScroll();
    });

});









