const controls = document.querySelector('.controls');
const cameraFacingMode = document.querySelector('.video-options>.select-facing-mode');
const cameraOptions = document.querySelector('.video-options>.select-camera');
const video = document.querySelector('video');
const canvas = document.querySelector('canvas');
const buttons = [...controls.querySelectorAll('button')];
const ppgText = document.querySelector('.ppg-text');
let hiddenCanvas = document.createElement("canvas");
let streamStarted = false;
let currentVideoTrack = null;
let previousPpg = [];

const [play, pause] = buttons;

cameraOptions.onchange = () => {
    startStream();
};
cameraFacingMode.onchange = () => {
    startStream();
};

play.onclick = () => {
    if (streamStarted) {
        video.play();
        return;
    }
    if ('mediaDevices' in navigator && navigator.mediaDevices.getUserMedia) {
        startStream();
    }
};

const pauseStream = () => {
    try {
        const imageCapture = new ImageCapture(track);
        const photoCapabilities = imageCapture.getPhotoCapabilities().then(() => {
            track.applyConstraints({
                advanced: [{torch: false}]
            });
        });
    } catch {
        
    }
    video.pause();
};

pause.onclick = pauseStream;

const startStream = async () => {
    if (currentVideoTrack != null) {
        currentVideoTrack.stop();
    }
    let constraints;
    if (cameraFacingMode.value == "any") {
        constraints = {
            video: {
                deviceId: {exact: cameraOptions.value},
                height: {ideal: 1080},
                width: {ideal: 1920}
            }
        };
    } else {
        constraints = {
            video: {
                deviceId: cameraOptions.value,
                facingMode: {exact: cameraFacingMode.value},
                height: {ideal: 1080},
                width: {ideal: 1920}
            }
        };
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    handleStream(stream);
};

function timerCallback() {
    if (video.paused || video.ended) {
        return;
    }
    getFrame();
    setTimeout(() => {
        timerCallback();
    }, 50);
};

const getFrame = () => {
    hiddenCanvas.width = video.videoWidth;
    hiddenCanvas.height = video.videoHeight;
    let ctx = hiddenCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    let frame = ctx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    let length = frame.data.length;
    let sumGreen = 0;
    let sumRed = 0;
    let sumBlue = 0;
    let pixels = 0;
    for (let i = 0; i < length; i += 4) {
        const red = frame.data[i + 0];
        const green = frame.data[i + 1];
        const blue = frame.data[i + 2];
        sumGreen += green;
        sumRed += red;
        sumBlue += blue;
        pixels++;
    }
    let redAverage = (sumGreen/pixels)/256;
    let blueAverage = (sumBlue/pixels)/256;
    let ppg = (sumGreen/pixels)/256;
    ppgText.innerHTML = ppg.toPrecision(4) + "," + redAverage.toPrecision(4) + "," + blueAverage.toPrecision(4);
    previousPpg.push(ppg);
    //hiddenCanvas.getContext('2d').putImageData(frame, 0, 0);
};

const handleStream = (stream) => {
    video.srcObject = stream;
    streamStarted = true;
    let track = stream.getVideoTracks()[0];
    currentVideoTrack = track;
    setTimeout(() => {
        timerCallback();
    }, 100);

    try {
        const imageCapture = new ImageCapture(track);
        const photoCapabilities = imageCapture.getPhotoCapabilities().then(() => {
            track.applyConstraints({
                advanced: [{torch: true}]
            });
        });
    } catch {
        
    }
};

const getCameraSelection = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    const options = videoDevices.map(videoDevice => {
        return `<option value="${videoDevice.deviceId}">${videoDevice.label}</option>`;
    });
    cameraOptions.innerHTML = options.join('');
};

getCameraSelection();