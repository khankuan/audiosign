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

}