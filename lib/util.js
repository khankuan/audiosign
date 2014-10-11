var AudioSignUtil = {

  hex2bin: function(x, size){
    var bitString = "";
    var lookupTable = {
        '0': '0000', '1': '0001', '2': '0010', '3': '0011', '4': '0100',
        '5': '0101', '6': '0110', '7': '0111', '8': '1000', '9': '1001',
        'a': '1010', 'b': '1011', 'c': '1100', 'd': '1101',
        'e': '1110', 'f': '1111',
        'A': '1010', 'B': '1011', 'C': '1100', 'D': '1101',
        'E': '1110', 'F': '1111'
    };
    for (var i = 0; i < x.length; i++)
      bitString += lookupTable[x[i]];

    while (size && bitString.length < size)
      bitString = '0' + bitString;

    return bitString;
  },



  bin2hex: function(x, size){
    var hexString = "";
    var lookupTable = {
        '0': '0000', '1': '0001', '2': '0010', '3': '0011', '4': '0100',
        '5': '0101', '6': '0110', '7': '0111', '8': '1000', '9': '1001',
        'a': '1010', 'b': '1011', 'c': '1100', 'd': '1101',
        'e': '1110', 'f': '1111',
        'A': '1010', 'B': '1011', 'C': '1100', 'D': '1101',
        'E': '1110', 'F': '1111'
    };
    for (var i = 0; i < x.length; i += 4){
      var hex = x.substring(i, i+4);
      var value = parseInt(hex, 2);
      hexString += value.toString(16);
    }

    while (size && hexString.length < size/4)
      hexString = '0' + hexString;

    return hexString;
  },
           


  randomBinary: function(size){
    var binString = "";
    for (var i = 0; i < size; i++)
      binString += Math.round(Math.random()*1);
    return binString;
  },

}