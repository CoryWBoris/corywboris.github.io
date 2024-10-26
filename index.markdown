---
layout: default
title: Home
permalink: /
---

<div class="bg">
    <div class="content">
        <h1>Welcome to My Static Website</h1>
        <p>This is a simple static website hosted on GitHub Pages.</p>
        <p>Check out my pride and joy, <a href="https://coryboris.gumroad.com/l/TrueAutoColor">TrueAutoColor</a></p>
    </div>
    <div class="audio-container">
        <div class="control-container">
            <button id="playPauseButton">Play</button>
            <button id="stopButton">Stop</button>
        </div>
        <!-- <audio id="audioPlayer" src="{{ site.baseurl }}/assets/audio/sunsetBoulevard.mp3"></audio> -->
        <div class="volume-slider-container">
            <div class="road">
                <input type="range" id="volumeSlider" min="0" max="100" value="75">
                <div class="car">
                    <svg class="car-body" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <rect x="2" y="10" width="20" height="8" fill="#007bff"/>
                    </svg>
                    <svg class="wheel front-wheel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="#000"/>
                    </svg>
                    <svg class="wheel back-wheel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="#000"/>
                    </svg>
                </div>
            </div>
        </div>
        <div class="speed-slider-container">
            <div class="road">
                <input type="range" id="speedSlider" min="50" max="150" value="100">
                <div class="car red-car">
                    <svg class="car-body" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <rect x="2" y="10" width="20" height="8" fill="#ff0000"/>
                    </svg>
                    <svg class="wheel front-wheel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="#000"/>
                    </svg>
                    <svg class="wheel back-wheel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="#000"/>
                    </svg>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="{{ site.baseurl }}/assets/js/audio-control.js" defer></script>