var AudioSignListener = function(options){

	/*	Variables	*/
	var _this = this;
	options = options || {};
	var size = options.size || 160;
	var step = options.step || 15;
	_this.bufferSize = 8192;
	var baseFrequency = 18600 - step * (size + 8) || options.baseFrequency;	//	8-bit CRC
	this._listeners = {};

	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	window.audioSignAudioContext = window.audioSignAudioContext || new window.AudioContext();

	/*	Listen Once variables	*/
	var binaryArray;
	var previousFoundCandidate;

	/*	Reset	*/
	this._reset = function(){
		binaryArray = [];
		previousFoundCandidate = undefined;
	}

	/*	Emit method	*/
	this._emit = function(type, data){
		for (var i in this._listeners[type]){
			if (this._listeners[type][i])
				this._listeners[type][i](data);
		}
	}

	/*	Process one listen	*/
	this._listenOnce = function(spectrum){
		var freqByteData = spectrum;

	    //	Compute median
	    var bins = [];
	    for (var i = 0; i < (size+8)*2; i++){
	        var binI = Math.floor((baseFrequency+i*step-size*step) / audioSignAudioContext.sampleRate * _this.bufferSize);
	    	bins.push(freqByteData[binI]);
	    }

	    bins = bins.sort(function(a,b){return a-b});
	    var median = bins[Math.floor(bins.length/2-1)];
	    var percentile25 = bins[Math.floor(bins.length/4-1)];
	    var percentile75 = bins[Math.floor(bins.length/4*3-1)];
	    var max = bins[bins.length-1];
	    average = median/18*17 + max/18*1 + percentile75/18*0;	//	Take median with some reference to max and percentile75

	    //	Current round result
	    var allZeros = true;
	    var resultBinaryArray = [];
	    for (var i = 0; i < size + 8; i++){
	        var binI = Math.floor((baseFrequency+i*step) / audioSignAudioContext.sampleRate * _this.bufferSize);
	    	if (freqByteData[binI] > average || freqByteData[binI+1] > average){
	            allZeros = false;
	            resultBinaryArray.push(1);
	        } else
	        	resultBinaryArray.push(0);
	    }

	    if (allZeros)
	    	return;

	    //	Candidate CRC
	    var valueBinaryArray = resultBinaryArray.slice(0, size);
	    var crcBinaryArray = resultBinaryArray.slice(size, size + 8);
	    var candidateValue = AudioSignUtil.bin2hex(valueBinaryArray.join(""));
	    var crcInt = crc.crc8(candidateValue);
	    var crcHex = crcInt.toString(16);
	    var crcBin = AudioSignUtil.hex2bin(crcHex, 8);
	    var checkCrcBin = crcBinaryArray.join("");
        if (crcBin == checkCrcBin){
	        
	        //	New candidate
	        previousFoundCandidate = previousFoundCandidate || [];
	        if (valueBinaryArray.toString() != previousFoundCandidate.toString()){
	        	previousFoundCandidate = valueBinaryArray;
	        	var resultHex = AudioSignUtil.bin2hex(valueBinaryArray.join(""));
	        	_this._emit('candidate', resultHex);
	        }
        }
	}
};

/*	Add an event listener	*/
AudioSignListener.prototype.on = function(type, callback){
	this._listeners[type] = this._listeners[type] || [];
	this._listeners[type].push(callback);
}

/*	Remove an event listener	*/
AudioSignListener.prototype.off = function(type, callback){
	if (this._listeners[type])
		this._listeners[type].remove(callback);
}

/*	Start listening	*/
AudioSignListener.prototype.start = function(){
	if (this._state == "Started")
		throw new Error("Already started");

	this._reset();
	this._state = "Started";
	var _this = this;

	/*	Callback for getUserMedia	*/
	function startListen(stream){
	    _this._mediaStream = stream;
		_this._audioInput = audioSignAudioContext.createMediaStreamSource(_this._mediaStream);

	    _this._scriptProcessorNode = audioSignAudioContext.createScriptProcessor(_this.bufferSize, 1, 1);
	    _this._scriptProcessorNode.onaudioprocess = function(audioProcessingEvent){
	    	var buffer = audioProcessingEvent.inputBuffer.getChannelData(0);
	    	for (var i=0; i<buffer.length; ++i)
	    		buffer[i] *= WindowFunction.Hamming(buffer.length, i)
	    	_this._fft.forward(buffer);

	        _this._listenOnce(_this._fft.spectrum);
	    }

	    _this._audioInput.connect(_this._scriptProcessorNode);
	    _this._scriptProcessorNode.connect(audioSignAudioContext.destination);
		_this._fft = new FFT(_this.bufferSize, 44100);
		_this._emit('started');
	}

	/*	getUserMedia	*/
	navigator.getUserMedia({
        audio: {
        	optional: [{
            	echoCancellation: false,
        	}]
        }
    }, startListen, function(e) {
    	throw e;
    });
}

/*	Stop listening	*/
AudioSignListener.prototype.stop = function(type, callback){
	if (this._state != "Started")
		throw new Error("Not started");

    this._mediaStream.stop();
    this._audioInput.disconnect();
    this._scriptProcessorNode.disconnect();

    delete this._mediaStream;
    delete this._audioInput;
    delete this._scriptProcessorNode;
	delete this._state;

	this._emit('stopped');
}

/*	Getusermedia across browser	*/
navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);