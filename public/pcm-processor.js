// public/pcm-processor.js

class PcmProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'targetSampleRate', defaultValue: 16000 }];
  }

  constructor(options) {
    super(options);
    this.targetSampleRate = options.processorOptions.targetSampleRate || 16000;
    this.inputBuffer = []; // To buffer audio data if necessary for resampling
    this.lastSentTime = 0;
    this.bufferDurationMs = 300; // Send data roughly every 300ms
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length === 0 || !input[0] || input[0].length === 0) {
      return true; // No data to process
    }

    // Assuming mono input
    const channelData = input[0];
    
    // --- Downsampling (if necessary) ---
    let resampledData = channelData;
    if (sampleRate !== this.targetSampleRate) {
      resampledData = this.downsample(channelData, sampleRate, this.targetSampleRate);
    }

    // --- Convert to 16-bit PCM ---
    const pcmData = new Int16Array(resampledData.length);
    for (let i = 0; i < resampledData.length; i++) {
      let val = resampledData[i];
      // Clamp value to [-1.0, 1.0]
      val = Math.max(-1, Math.min(1, val));
      pcmData[i] = val * 0x7FFF; // Multiply by 32767
    }

    // --- Convert Int16Array to Base64 string ---
    // To Base64, we need a binary string.
    // Each Int16 is 2 bytes.
    let binaryString = '';
    for (let i = 0; i < pcmData.length; i++) {
      const byte1 = pcmData[i] & 0xff;          // LSB
      const byte2 = (pcmData[i] >> 8) & 0xff;   // MSB
      binaryString += String.fromCharCode(byte1) + String.fromCharCode(byte2);
    }
    const base64PcmData = btoa(binaryString);

    this.port.postMessage(base64PcmData);

    return true; // Keep processor alive
  }

  downsample(buffer, inputSampleRate, outputSampleRate) {
    if (inputSampleRate === outputSampleRate) {
      return buffer;
    }
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }
}

registerProcessor('pcm-processor', PcmProcessor);
