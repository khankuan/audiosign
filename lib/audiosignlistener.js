var AudioSignListener = function(options){

	/*	Variables	*/
	var _this = this;
	options = options || {};
	var size = options.size || 32;
	var step = options.step || 80;
	var diminishingFactor = options.diminishingFactor || 0.95;
	var threshold = options.threshold || 0.2;
	var candidateFoundStreak = options.candidateFoundStreak || 40;
	var baseFrequency = 19000 - step * size || options.baseFrequency;
	this._listeners = {};

	/*	Listen Once variables	*/
	var binaryArray ;
	var candidatePrevious;
	var candidateStreak ;
	var previousFoundCandidate;

	/*	Reset	*/
	this._reset = function(){
		binaryArray = [];
		delete candidatePrevious;
		candidateStreak = 0;
	}

	/*	Emit method	*/
	this._emit = function(type, data){
		for (var i in this._listeners[type]){
			if (this._listeners[type][i])
				this._listeners[type][i](data);
		}
	}

	/*	Process one listen	*/
	this._listenOnce = function(){

		//	Get frequency data
	    var freqByteData = new Uint8Array(_this._analyserNode.frequencyBinCount);
	    _this._analyserNode.getByteFrequencyData(freqByteData);

	    //	Compute average
	    var sum = 0;
	    var moreThanZero = 0;
	    var min;
	    for (var i = 0; i < size; i++){
	        var binI = Math.floor((baseFrequency+i*step) / audioSignAudioContext.sampleRate * 2048);
	        sum += freqByteData[binI];
	        if (freqByteData[binI] > 0)
	            moreThanZero++;
	        if (freqByteData[binI] > 0 && freqByteData[binI] < min)
	            min = freqByteData[binI];
	    }
	    var average = sum/moreThanZero/2;

	    //	Populate sound to binaryArray
	    var currentByteBinary = [];
	    for (var i = 0; i < size; i++){
	        var binI = Math.floor((baseFrequency+i*step) / audioSignAudioContext.sampleRate * 2048);

	        if (freqByteData[binI] > average || freqByteData[binI+1] > average){
	            binaryArray[i] = (binaryArray[i] || 0)*diminishingFactor + (1-diminishingFactor);
	            currentByteBinary[i] = 1;
	        } else {
	            binaryArray[i] = (binaryArray[i] || 0)*diminishingFactor;
	            currentByteBinary[i] = 0;
	        }

	        if (binaryArray[i] < 0.01)
	            binaryArray[i] = 0;
	    }

	    //	Current round result
	    var resultBinaryArray = binaryArray.map(function(b){
	        if (b > threshold)
	            return 1;
	        return 0;
	    });
	    var resultInt = AudioSignUtil.binaryArrayToInteger(resultBinaryArray);

	    //  Candidate invalid
	    if (resultInt == 0  || resultInt == Math.max(2, size)-1)
	        return;
	    
	    //	Candidate streak
	    if (resultInt == candidatePrevious){
	        candidateStreak++;
	        if (candidateStreak >= candidateFoundStreak){
		        
		        //	New candidate
		        if (resultInt != previousFoundCandidate){
		        	previousFoundCandidate = resultInt;
		        	_this._emit('candidate', resultInt);
		        }
	        }
	    } else {
	        candidatePrevious = resultInt;
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
	window.audioSignAudioContext = window.audioSignAudioContext || new webkitAudioContext();

	/*	Callback for getUserMedia	*/
	function startListen(stream){
	    _this._mediaStream = stream;
		_this._audioInput = audioSignAudioContext.createMediaStreamSource(_this._mediaStream);

	    _this._analyserNode = audioSignAudioContext.createAnalyser();
	    _this._analyserNode.fftSize = 2048;
	    _this._analyserNode.smoothingTimeConstant = 0;

	    _this._scriptProcessorNode = audioSignAudioContext.createScriptProcessor(1024, 1, 1);
	    _this._scriptProcessorNode.onaudioprocess = function(audioProcessingEvent) {
	        _this._listenOnce();
	    }

	    _this._audioInput.connect(_this._analyserNode);
	    _this._analyserNode.connect(_this._scriptProcessorNode);
	    _this._scriptProcessorNode.connect(audioSignAudioContext.destination);
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
    delete this._audioInput;
    delete this._mediaStream;
    delete this._analyserNode;
    delete this._scriptProcessorNode;
	delete this._state;
}

/*	Getusermedia across browser	*/
navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);