let audioCtx, gainNode, source, buffer, startTime, pauseTime, isPlaying = false;

document.addEventListener('DOMContentLoaded', function() {
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
            const arrayBuffer = await response.arrayBuffer();
            buffer = await audioCtx.decodeAudioData(arrayBuffer);
            console.log("Audio loaded successfully");
        } catch (err) {
            console.error(`Unable to fetch or decode the audio file. Error: ${err.message}`);
            // Handle the error (e.g., show a message to the user)
        }
    }

    playPauseButton.addEventListener('click', async function() {
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

    stopButton.addEventListener('click', function() {
        if (source) {
            source.stop();
            source = null;
        }
        isPlaying = false;
        pauseTime = 0;
        playPauseButton.textContent = 'Play';
        stopButton.disabled = true;
    });

    volumeSlider.addEventListener('input', function() {
        updateCarPosition(volumeSlider.value, car, 0, 100);
        if (gainNode) {
            gainNode.gain.value = volumeSlider.value / 100;
        }
        // volumeLabel.textContent = `Volume: ${volumeSlider.value}%`;
    });

    speedSlider.addEventListener('input', function() {
        updateCarPosition(speedSlider.value, redCar, speedRange.min, speedRange.max);
        if (source) {
            source.playbackRate.value = speedSlider.value / 100;
        }
        // speedLabel.textContent = `Varispeed: ${(speedSlider.value / 100).toFixed(1)}`;
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
});
