(function(){
  window.lazyScript = function( scriptsArr, async, type ){
    if( typeof scriptsArr === 'string' ) scriptsArr = [ scriptsArr ];
    if( async === undefined ) async = true;
    if( !type ) type = 'text/javascript';
    var body = document.getElementsByTagName('body')[0];
    for( var i = 0; i < scriptsArr.length; i++ ){
      var script = document.createElement('script');
      script.type = type;
      script.async = async;
      script.src = scriptsArr[i];
      body.appendChild( script );
    }
  };
})();