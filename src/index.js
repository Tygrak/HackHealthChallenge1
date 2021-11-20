import "https://cdn.plot.ly/plotly-2.6.3.min.js"

const controls = document.querySelector('.controls');
const cameraFacingMode = document.querySelector('.video-options>.select-facing-mode');
const cameraOptions = document.querySelector('.video-options>.select-camera');
const recordingLengthOptions = document.querySelector('.video-options>.recording-length');
const video = document.querySelector('video');
const canvas = document.querySelector('canvas');
const buttons = [...controls.querySelectorAll('button')];
const ppgText = document.querySelector('.ppg-text');
const recordingText = document.querySelector('.recording-text');
const chartCanvas = document.querySelector(".chart-canvas");
let hiddenCanvas = document.createElement("canvas");
let streamStarted = false;
let currentVideoTrack = null;
let redSeries = [];
let greenSeries = [];
let blueSeries = [];
let timesSeries = [];
let startingRecording = false;
let recordingLength = 30;
let durationBetweenFrames = 1;
let isRecording = false;
let recordingStart = 0;

const [play, pause] = buttons;

cameraOptions.onchange = () => {
    startStream();
};
cameraFacingMode.onchange = () => {
    startStream();
};
video.onclick = () => {
    startCamera();
    startingRecording = true;
    recordingStart = new Date();
    recordingText.innerText = "Cover camera with index finger to start recording.\nThe screen should be mostly red.";
};
chartCanvas.onclick = () => {
    chartCanvas.style.display = "none";
};

play.onclick = () => {
    startCamera();
};

function startRecording() {
    startingRecording = false;
    isRecording = true;
    recordingStart = new Date();
    recordingLength = recordingLengthOptions.value;
    greenSeries = [];
    redSeries = [];
    blueSeries = [];
    timesSeries = [];
}

function startCamera() {
    if (streamStarted) {
        timerCallback();
        video.play();
        return;
    }
    if ('mediaDevices' in navigator && navigator.mediaDevices.getUserMedia) {
        startStream();
    }
}

function pauseStream () {
    video.pause();
    if (currentVideoTrack != null) {
        currentVideoTrack.stop();
    }
    streamStarted = false;
};

pause.onclick = pauseStream;

async function startStream() {
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

function handleStream(stream) {
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

function timerCallback() {
    if (video.paused || video.ended) {
        recordingText.innerText = "Camera stopped.\nTouch screen to start camera again.";
        return;
    }
    getFrame();
    let seconds = Math.abs(new Date() - recordingStart) / 1000;
    if (seconds > recordingLength && isRecording) {
        finishRecording();
    }
    setTimeout(() => {
        timerCallback();
    }, durationBetweenFrames);
};

function getFrame() {
    hiddenCanvas.width = 128;
    hiddenCanvas.height = 128;
    let ctx = hiddenCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
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
    let redAverage = (sumRed/pixels)/256;
    let blueAverage = (sumBlue/pixels)/256;
    let greenAverage = (sumGreen/pixels)/256;
    ppgText.innerHTML = redAverage.toPrecision(4) + "," + greenAverage.toPrecision(4) + "," + blueAverage.toPrecision(4);
    if (isRecording) {
        if (blueAverage < 0.2 && greenAverage < 0.35 && redAverage > 0.7) {
            greenSeries.push(greenAverage);
            redSeries.push(redAverage);
            blueSeries.push(blueAverage);
            let seconds = recordingLength - Math.abs(new Date()-recordingStart)/1000;
            timesSeries.push(seconds);
            recordingText.innerText = seconds.toPrecision(2);
        } else {
            recordingText.innerText = "Please make sure you are recording your finger correctly.\nThe screen should be mostly red.";
        }
    } else if (startingRecording) {
        if (blueAverage < 0.2 && greenAverage < 0.35 && redAverage > 0.7) {
            let seconds = recordingLength - Math.abs(new Date()-recordingStart)/1000;
            if (seconds > 0.75) {
                startRecording();
            }
        } else {
            recordingStart = new Date();
        }
    }
    //hiddenCanvas.getContext('2d').putImageData(frame, 0, 0);
};

function finishRecording() {
    isRecording = false;
    currentVideoTrack.stop();
    console.log("recording finished");
    recordingText.innerHTML = "";
    console.log(greenSeries);
    redSeries.reverse();
    greenSeries.reverse();
    blueSeries.reverse();
    timesSeries.reverse();
    let result = "";
    for (let i = 0; i < redSeries.length; i++) {
        result += redSeries[i] + ";";
    }
    result += "\n";
    for (let i = 0; i < greenSeries.length; i++) {
        result += greenSeries[i] + ";";
    }
    result += "\n";
    for (let i = 0; i < blueSeries.length; i++) {
        result += blueSeries[i] + ";";
    }
    result += "\n";
    for (let i = 0; i < timesSeries.length; i++) {
        result += timesSeries[i] + ";";
    }
    result += "\n";
    createDownload(result, "data.txt");
    drawGraph();
}

function drawGraph() {
    chartCanvas.style.display = "block";
    var trace1 = {
        x: timesSeries,
        y: redSeries,
        type: 'scatter'
    };
    var layout = {
        title: {
            text:'PPG',
            xref: 'paper',
        },
        xaxis: {
            title: {
                text: 'Time',
            },
        },
        yaxis: {
            title: {
                text: 'PPG',
            }
        }
    };
    var data = [trace1];
    Plotly.newPlot('chart-canvas', data, layout);
}

async function getCameraSelection() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    const options = videoDevices.map(videoDevice => {
        return `<option value="${videoDevice.deviceId}">${videoDevice.label}</option>`;
    });
    cameraOptions.innerHTML = options.join('');
};

function createDownload(data, filename) {
    let file = new Blob([data], {type: "text/plain"});
    if (window.navigator.msSaveOrOpenBlob) { // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    } else { // Others
        let a = document.createElement("a");
        let url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

getCameraSelection();