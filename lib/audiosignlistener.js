var AudioSignListener = function(options){

	/*	Variables	*/
	var _this = this;
	options = options || {};
	var size = options.size || 64;
	var step = options.step || 35;
	_this.bufferSize = 4096;
	var diminishingFactor = options.diminishingFactor || 0.9;
	var threshold = options.threshold || 0.15;
	var candidateFoundStreak = options.candidateFoundStreak || 12;
	var baseFrequency = 18600 - step * size || options.baseFrequency;
	this._listeners = {};

	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	window.audioSignAudioContext = window.audioSignAudioContext || new window.AudioContext();

	/*	Listen Once variables	*/
	var binaryArray;
	var candidatePrevious;
	var candidateStreak;
	var previousFoundCandidate;

	/*	Reset	*/
	this._reset = function(){
		binaryArray = [];
		candidatePrevious = undefined;
		candidateStreak = 0;
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
	    for (var i = 0; i < size*2; i++){
	        var binI = Math.floor((baseFrequency+i*step-size*step) / audioSignAudioContext.sampleRate * _this.bufferSize);
	    	bins.push(freqByteData[binI]);
	    }

	    bins = bins.sort(function(a,b){return a-b});
	    var median = bins[Math.floor(bins.length/2-1)];
	    var percentile25 = bins[Math.floor(bins.length/4-1)];
	    var percentile75 = bins[Math.floor(bins.length/4*3-1)];
	    var max = bins[bins.length-1];
	    average = median/18*17 + max/18*1 + percentile75/18*0;	//	Take median with some reference to max and percentile75

	    //	Populate sound to binaryArray
	    var currentByteBinary = [];
	    var allZeros = true;
	    for (var i = 0; i < size; i++){
	        var binI = Math.floor((baseFrequency+i*step) / audioSignAudioContext.sampleRate * _this.bufferSize);

	        if (freqByteData[binI] > average){//} || freqByteData[binI+1] > average){
	            binaryArray[i] = (binaryArray[i] || 0)*diminishingFactor + (1-diminishingFactor);
	            currentByteBinary[i] = 1;
	        } else {
	            binaryArray[i] = (binaryArray[i] || 0)*diminishingFactor;
	            currentByteBinary[i] = 0;
	        	binaryArray[i] -= 0.05;
	        }

	        if (binaryArray[i] < 0.01)
	            binaryArray[i] = 0;
	    }

	    //	Current round result
	    var resultBinaryArray = binaryArray.map(function(b){
	        if (b > threshold){
	            allZeros = false;
	            return 1;
	        }
	        return 0;
	    });

	    if (allZeros)
	    	return;

	    //	Candidate streak
		candidatePrevious = candidatePrevious || [];
	    if (resultBinaryArray.toString() == candidatePrevious.toString()){
	        candidateStreak++;
	        if (candidateStreak >= candidateFoundStreak){
		        
		        //	New candidate
		        previousFoundCandidate = previousFoundCandidate || [];
		        if (resultBinaryArray.toString() != previousFoundCandidate.toString()){
		        	previousFoundCandidate = resultBinaryArray;
		        	var resultHex = AudioSignUtil.bin2hex(resultBinaryArray.join(""));
		        	_this._emit('candidate', resultHex);
		        }
	        }
	    } else {
	        candidatePrevious = resultBinaryArray;
	        candidateStreak = 0;
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

	_this._emit('stopped');
}

/*	Getusermedia across browser	*/
navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);