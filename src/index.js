const controls = document.querySelector('.controls');
const cameraOptions = document.querySelector('.video-options>select');
const video = document.querySelector('video');
const screenshotImage = document.querySelector('img');
const buttons = [...controls.querySelectorAll('button')];
let streamStarted = false;
let hiddenCanvas = document.createElement("canvas");
let lastDeviceId = "";
let devicesFound = 0;
//document.body.appendChild(hiddenCanvas);

const [play, pause, screenshot] = buttons;

const constraints = {
    video: {
      width: {
        min: 800,
        ideal: 800,
        max: 2560,
      },
      height: {
        min: 600,
        ideal: 600,
        max: 1440
      },
    }
  };

play.onclick = () => {
    if (streamStarted && lastDeviceId == cameraOptions.value) {
        video.play();
        timerCallback();
        return;
    }
    if ('mediaDevices' in navigator && navigator.mediaDevices.getUserMedia) {
        startStream();
    }
};

const pauseStream = () => {
    video.pause();
};

const getFrame = () => {
    console.log("a");
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

pause.onclick = pauseStream;

const getCameraSelection = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log(videoDevices);
    let options = [];
    for (let i = 0; i < videoDevices.length; i++) {
        const videoDevice = videoDevices[i];
        let label = videoDevice.label;
        if (label == "") {
            label = videoDevice.deviceId;
        }
        options.push(`<option value="${videoDevice.deviceId}">${label}</option>`);
    }
    cameraOptions.innerHTML = options.join('');
    devicesFound = videoDevices.length;
};

function timerCallback() {
    console.log("a");
    if (video.paused || video.ended) {
        return;
    }
    //getFrame();
    setTimeout(() => {
        timerCallback();
    }, 100);
};

getCameraSelection();

const SUPPORTS_MEDIA_DEVICES = 'mediaDevices' in navigator;

const startStream = async () => {
    if (SUPPORTS_MEDIA_DEVICES) {
        if (devicesFound === 0) {
            throw 'No camera found on this device.';
        }

        navigator.mediaDevices.getUserMedia({
            ...constraints,
            deviceId: {
                exact: cameraOptions.value
            }
        }).then(stream => {
            video.srcObject = stream;
            streamStarted = true;
            lastDeviceId = cameraOptions.value;
            const track = stream.getVideoTracks()[0];
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
        });
    }
};
