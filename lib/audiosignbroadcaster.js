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
}