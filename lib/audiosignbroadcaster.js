var AudioSignBroadcaster = function(options){

	/*	Variables	*/
	var _this = this;
	options = options || {};
	var size = options.size || 160;
	var step = options.step || 15;
	var blink = options.blink || {cycle: 1000, active: 300};
	var baseFrequency = options.baseFrequency || 18600 - step * (size + 8);	//	8-bit CRC
	this.binaryId = AudioSignUtil.hex2bin(options.id || AudioSignUtil.bin2hex(AudioSignUtil.randomBinary(size)), size);
	if (this.binaryId.indexOf(undefined) >= 0)
		throw "Invalid Id. Id must be a hex string.";
	this.id = AudioSignUtil.bin2hex(this.binaryId);

	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	window.audioSignAudioContext = window.audioSignAudioContext || new window.AudioContext();

	/*	Create buffer and play	*/
	this._startBuffer = function(){
		/*	Creating sound buffer	*/
		_this._sound = audioSignAudioContext.createBufferSource();
	    _this._sound.loop = true;

	    /* Create a gain gainNode	*/
		_this._gainNode = audioSignAudioContext.createGain();
	    _this._sound.connect(_this._gainNode);
		_this._gainNode.connect(audioSignAudioContext.destination);

	    /*	Populate sound buffer	*/
	    var bufferSize = 1 * audioSignAudioContext.sampleRate;
	    var soundBuffer = audioSignAudioContext.createBuffer(1, bufferSize, audioSignAudioContext.sampleRate);
	    var soundOutput = soundBuffer.getChannelData(0);

	    var totalSound = 0;
	    for (var i = 0; i < size; i++){
	        if (this.binaryId[i] > 0){
	            totalSound += 1;
	            for (var j = 0; j < bufferSize; j++)
	                soundOutput[j] += Math.sin( (2 * Math.PI * (baseFrequency+i*step) * j) / (audioSignAudioContext.sampleRate))
	        }
	    }

	    //	CRC
	    var crcHex = crc.crc8(_this.id).toString(16);
	    var crcBin = AudioSignUtil.hex2bin(crcHex, 8);
	    for (var i = 0; i < crcBin.length; i++){
	    	if (crcBin[i] > 0){
	            totalSound += 1;
	            for (var j = 0; j < bufferSize; j++)
	                soundOutput[j] += Math.sin( (2 * Math.PI * (baseFrequency+(i+size)*step) * j) / (audioSignAudioContext.sampleRate))
	        }
	    }

	    for (var i = 0; i < bufferSize; i++)
	        soundOutput[i] /= totalSound;

	    _this._sound.buffer = soundBuffer;

	    /*	Start	*/
	    _this._sound.start(0);

	    /*	Blink Mode	*/
	    if (blink){
	    	_this._blinkInterval = setInterval(function(){
	    		//	Set volume 0
	    		_this._gainNode.gain.value = 1;
	    		_this._blinkTimeout = setTimeout(function(){
	    			_this._gainNode.gain.value = 0;
	    		}, blink.active);
	    	}, blink.cycle);
	    }
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

	clearInterval(this._blinkInterval);
	clearTimeout(this._blinkTimeout);

	this._sound.stop();
	delete this._sound;
	delete this._gainNode;
	delete this._state;
}