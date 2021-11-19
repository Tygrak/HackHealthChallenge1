const controls = document.querySelector('.controls');
const cameraOptions = document.querySelector('.video-options>select');
const video = document.querySelector('video');
const canvas = document.querySelector('canvas');
const buttons = [...controls.querySelectorAll('button')];
let streamStarted = false;
let currentVideoTrack = null;

const [play, pause] = buttons;

cameraOptions.onchange = () => {
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
    video.pause();
};

pause.onclick = pauseStream;

const startStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            deviceId: cameraOptions.value,
            height: {ideal: 1080},
            width: {ideal: 1920}
        }
    });
    handleStream(stream);
};

function timerCallback() {
    if (video.paused || video.ended) {
        return;
    }
    //getFrame();
    setTimeout(() => {
        timerCallback();
    }, 100);
};

const getFrame = () => {
    hiddenCanvas.width = video.videoWidth;
    hiddenCanvas.height = video.videoHeight;
    let ctx = hiddenCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    let frame = ctx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    let length = frame.data.length;
    for (let i = 0; i < length; i += 4) {
        const red = frame.data[i + 0];
        const green = frame.data[i + 1];
        const blue = frame.data[i + 2];
    }
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