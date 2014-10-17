# AudioSignJS: Audio-based signature using WebAudio and WebRTC #

AudioSignJS allows the broadcasting/listening of an id (default 64-bits) to/from a device to another via sound (Ultrasound). It uses WebAudio to generate a soundwave and loops it continuously while broadcasting. When listening, it uses WebRTC to listen from the mic and WebAudio to process the sound captured. Currently, only 1 device can broadcast at one location at the same time. 

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
- Distance is about 0-10 metres, depending on noise level, volume and environment. 
- Candidates found might not be extremely accurate. Do consider adding some failsafe mechanism to handle wrong ids.
- IDs is appended with 8 bits CRC for correctness.

**Listener**
```javascript
var listener = new AudioSign.AudioSignListener(options);  //  Create a new listener
listener.on('candidate', function(x){                     //  Callback when new candidate id (default 64-bit) is heard
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
console.log(broadcaster.id);                              //  The id (default 64-bit) that the broadcaster is broadcasting
//  Do other stuff...
broadcaster.stop();                                       //  Do not wish to broadcast anymore
```

## Advance Usage
**Listener**
Options are available to configure certain settings:
- size: Size of the id, Default 64-bits. As size increases, it becomes more unstable and audible.
- step: Step size between each frequency for each bit. Default 15. Too small, more unstable. Too big, audio can be more noticable.
- baseFrequency: Base frequency to start with. Default is 18600 - (size+8) * step. Lower frequency makes the audio more noticable.
- Optional events: 'started', 'stopped'

**Broadcaster**
Options are available to configure certain settings:
- size: Size of the id, Default 64-bits. As size increases, it becomes more unstable.
- step: Step size between each frequency for each bit. Default 35. Too small, more unstable. Too big, audio can be more noticable.
- baseFrequency: Base frequency to start with. Default is 18600 - size * step. Lower frequency makes the audio more noticable.
