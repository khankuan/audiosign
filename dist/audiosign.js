var AudioSignUtil = {

  /*	Converting 32-bit Integer to Binary Array	*/
  integerToBinaryArray: function(integer, size){
    var binaryArray = [];
    var integerString = integer.toString(2);
    for (var i = 0; i < size; i++){
      if (integerString[integerString.length-1-i] == '1')
        binaryArray.push(1);
      else
        binaryArray.push(0);
    }
    
    return binaryArray.reverse();
  },


  binaryArrayToInteger: function(binaryArray){
    var strength = 1;
    var integer = 0;
    for (var i = 0; i < binaryArray.length; i++){
      if (binaryArray[binaryArray.length-1-i] >= 0.5)
        integer += strength;
      strength *=2;
    }

    return integer;
  },

};

var AudioSignBroadcaster = function(options){

	/*	Variables	*/
	var _this = this;
	options = options || {};
	var size = options.size || 32;
	var step = options.step || 80;
	var baseFrequency = options.baseFrequency || 19000 - step * size;
	if (options.id == 0 || options.id == Math.pow(2,size)-1)
		throw new Error("Invalid Id");
	this.id = options.id || Math.floor(Math.random()*(Math.pow(2, size)));	//	Cannot be 0 or largest
	this.binaryArrayId = AudioSignUtil.integerToBinaryArray(this.id, size);
	window.AudioContext = AudioContext || webkitAudioContext;
	window.audioSignAudioContext = window.audioSignAudioContext || new AudioContext();

	/*	Create buffer and play	*/
	this._startBuffer = function(){
		/*	Creating sound buffer	*/
		_this._sound = audioSignAudioContext.createBufferSource();
	    _this._sound.loop = true;
	    _this._sound.connect(audioSignAudioContext.destination);

	    /*	Populate sound buffer	*/
	    var bufferSize = 1 * audioSignAudioContext.sampleRate;
	    var soundBuffer = audioSignAudioContext.createBuffer(1, bufferSize, audioSignAudioContext.sampleRate);
	    var soundOutput = soundBuffer.getChannelData(0);

	    var totalSound = 0;
	    for (var i = 0; i < size; i++){
	        if (this.binaryArrayId[i] > 0){
	            totalSound += 1;
	            for (var j = 0; j < bufferSize; j++)
	                soundOutput[j] += Math.sin( (2 * Math.PI * (baseFrequency+i*step) * j) / (audioSignAudioContext.sampleRate))
	        }
	    }

	    for (var i = 0; i < bufferSize; i++)
	        soundOutput[i] /= totalSound;

	    _this._sound.buffer = soundBuffer;

	    /*	Start	*/
	    _this._sound.start(0);
	}
};

/*	Start broadcasting	*/
AudioSignBroadcaster.prototype.start = function(){
	if (this._state == "Started")
		throw new Error("Already started");

	this._state = "Started";
	this._startBuffer();
}

/*	Stop broadcasting	*/
AudioSignBroadcaster.prototype.stop = function(){
	if (this._state != "Started")
		throw new Error("Not started");

	this._sound.stop();
	delete this._sound;
	delete this._state;
};

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
	window.AudioContext = AudioContext || webkitAudioContext;
	window.audioSignAudioContext = window.audioSignAudioContext || new AudioContext();

	/*	Listen Once variables	*/
	var binaryArray;
	var candidatePrevious;
	var candidateStreak ;
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
	this._listenOnce = function(){

		//	Get frequency data
	    var freqByteData = new Uint8Array(_this._analyserNode.frequencyBinCount);
	    _this._analyserNode.getByteFrequencyData(freqByteData);

	    //	Compute median
	    var bins = [];
	    for (var i = 0; i < size*2; i++){
	        var binI = Math.floor((baseFrequency+i*step-size*step) / audioSignAudioContext.sampleRate * 2048);
	    	bins.push(freqByteData[i]);
	    }
	    bins = bins.sort(function(a,b){return a-b});
	    var median = bins[Math.floor(bins.length/2)];
	    var percentile25 = bins[Math.floor(bins.length/4)];
	    var percentile75 = bins[Math.floor(bins.length/4*3)];
	    average = Math.max(median/2, percentile25);

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

	/*	Callback for getUserMedia	*/
	function startListen(stream){
	    _this._mediaStream = stream;
		_this._audioInput = audioSignAudioContext.createMediaStreamSource(_this._mediaStream);

	    _this._analyserNode = audioSignAudioContext.createAnalyser();
	    _this._analyserNode.fftSize = 2048;
	    _this._analyserNode.smoothingTimeConstant = 0;

	    _this._scriptProcessorNode = audioSignAudioContext.createScriptProcessor(1024, 1, 1);
	    _this._scriptProcessorNode.onaudioprocess = function(audioProcessingEvent){
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
    this._audioInput.disconnect();
    this._analyserNode.disconnect();
    this._scriptProcessorNode.disconnect();

    delete this._mediaStream;
    delete this._audioInput;
    delete this._analyserNode;
    delete this._scriptProcessorNode;
	delete this._state;
}

/*	Getusermedia across browser	*/
navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);;

var AudioSign = {
	AudioSignBroadcaster: AudioSignBroadcaster,
	AudioSignListener: AudioSignListener,
}