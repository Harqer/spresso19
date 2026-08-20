class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = new Int16Array(2048);
        this.offset = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const channel = input[0];
            for (let i = 0; i < channel.length; i++) {
                // Convert float [-1.0, 1.0] to int16 [-32768, 32767]
                let sample = Math.max(-1, Math.min(1, channel[i]));
                this.buffer[this.offset++] = sample < 0 ? sample * 32768 : sample * 32767;

                if (this.offset >= this.buffer.length) {
                    this.port.postMessage(this.buffer.slice(0));
                    this.offset = 0;
                }
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
