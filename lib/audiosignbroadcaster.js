var AudioSignBroadcaster = function(options){

	/*	Variables	*/
	var _this = this;
	options = options || {};
	var size = options.size || 64;
	var step = options.step || 35;
	var baseFrequency = options.baseFrequency || 18600 - step * size;
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
	    _this._sound.connect(audioSignAudioContext.destination);

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
}