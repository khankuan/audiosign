# AudioSignJS: Audio-based signature using WebAudio and WebRTC #

AudioSignJS allows the broadcasting/listening of an id (32-bits) to/from a device to another via sound (Ultrasound). It uses WebAudio to generate a soundwave and loops it continuously while broadcasting. When listening, it uses WebRTC to listen from the mic and WebAudio to process the sound captured. Currently, only 1 device can broadcast at one location at the same time. 

The library can be used for the purpose such as pairing devices, or transmitting codes, etc.


## Setup


**Include the library**

```html
<script src="audiosign.js"></script>
```


## Basic Usage
**Notes**
- Off mic cancellation if your device have it.
- Remember to on volume and remove earpiece to be able to allow other devices to listen.
- Distance is about 0-3 metres, depending on noise level and volume. 
- Might not work on all devices. Listening does not seem to work for Android so far.
- Candidates found might not be extremely accurate. Do consider adding some failsafe mechanism to handle wrong ids.
```
**Listener**
```javascript
var listener = new AudioSign.AudioSignListener(options);  //  Create a new listener
listener.on('candidate', function(x){                     //  Callback when new candidate id (32-bit) is heard
  console.log(x);
});
listener.start();                                         //  Start listening
//  Do other stuff...
listener.stop();                                          //  Do not wish to listen anymore
```
**Broadcaster**
```javascript
var broadcaster = new AudioSign.AudioSignBroadcaster(options);  //  Create a new broadcaster
broadcaster.start();                                      //  Start broadcasting
console.log(broadcaster.id);                              //  The id (32-bit) that the broadcaster is broadcasting
//  Do other stuff...
broadcaster.stop();                                       //  Do not wish to broadcast anymore
```

## Advance Usage
**Listener**
Options are available to configure certain settings:
- size: Size of the id, Default 32-bits. As size increases, it becomes more unstable.
- step: Step size between each frequency for each bit. Default 80. Too small, more unstable. Too big, audio can be more noticable.
- baseFrequency: Base frequency to start with. Default is 19000 - size * step. Lower frequency makes the audio more noticable.
- diminishingFactor: Factor for each bit's value to drop per cycle.
- threshold: Factor for each bit to be counted as positive
- candidateFoundStreak: Number of cycles to declare a new candidate found.

**Broadcaster**
Options are available to configure certain settings:
- size: Size of the id, Default 32-bits. As size increases, it becomes more unstable.
- step: Step size between each frequency for each bit. Default 80. Too small, more unstable. Too big, audio can be more noticable.
- baseFrequency: Base frequency to start with. Default is 19000 - size * step. Lower frequency makes the audio more noticable.
