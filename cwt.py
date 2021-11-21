import numpy as np
from scipy import signal

def cwtize(reds, times):
    data_len = len(np.array(reds))
    start = (data_len // 50) + 10
    stop = -((data_len // 40) + 15)
    wavelet_width = (data_len // 150) + 2
    wavelet_width = wavelet_width // 2 

    cwt = signal.cwt(np.array(reds), signal.ricker, np.arange(wavelet_width, wavelet_width+1))

    ppg = np.array(reds[start:stop])
    ppg = ppg - np.mean(ppg)
    inv_cwt = [-x for x in cwt[0][start:stop]]

    peaks_indices = signal.find_peaks(inv_cwt)[0]
    peaks_indices = np.array(peaks_indices)
    peaks = np.array(times)[peaks_indices + start]

    hr60s = len(peaks)*60/(times[stop] - times[start])
    peaks_ampl = ppg[peaks_indices]
    return {"heart_rate": hr60s, "peaks_time": peaks, "peaks_amplitude": peaks_ampl};

