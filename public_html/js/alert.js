(function(){
  
  var logDiv = document.getElementById('log');
  var log = function(str){
    var temp = logDiv.innerHTML;
    logDiv.innerHTML = temp + '<br/>' + str;
  };
  
  log( 'Carregado!' );
  
  console.log( 'window.innerHeight', window.innerHeight );
  console.log( 'window.innerWidth', window.innerWidth );
  
})();
