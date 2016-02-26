(function(window, document){
  /*
   * Detectar monitores:
   * - window.screen:
   *  - height
   *  - width
   *  - colorDepth
   *  - pixelDepth (Firefox / Chrome)
   *  - availWidth : width menos elementos da janela
   *  - availHeight : height menos elementos da janela
   *  
   * - window.innerHeight
   * - window.innerWidth
   * 
   * Estrutura de configuração ao registrar/adicionar um objeto ao Carregador:
   * config: {
   *  name: 'string' : nome desse objeto de configuração, para remover ele depois
   *  reload: 'boolean' false : informa se ao recolocar o elemento precisamos recarregar do servidor
   *  remove: 'boolean' true : informa se a tag pode ser removida após colocada na página,
   *    // isso acontecerá quando uma das restrições/predicados informar falso para essa tag
   *  type : 'string' '' : informa o tipo de tag que será usado
   *    // valores disponíveis: 'js', 'css'
   *    
   *  predicates: 'object' {} : informa as restrições dessa configuração
   *    {
   *      innerHeight: 'array' [ 'string', 'number' ] : verifica com o valor de "window.innerHeight"
   *      innerWidth: 'array' [ 'string', 'number' ] : verifica com o valor de "window.innerWidth"
   *    }
   *  
   *  tag: 'object' : informações da tag que será usada, a configuração da tag que será usada não é possível
   *    {
   *      rel: 'string' 'stylesheet' : para css, informa o campo "rel" da tag "link"
   *      type: 'string' 'text/css|text/javascript': informa o campo "type" da tag
   *      async: 'boolean' true : para script, informa o campo "async" (html5) da tag "script"
   *      src: 'string' : o link a ser carregado
   *      href: 'string' : o link a ser carregado
   *       // quando for a hora de escolher o link, será verificado "src" e depois "href",
   *       // assim pode ser usado qualquer um para definir um link, criando um possível padrão
   *    }
   *  _tag: 'DomNode' : criado pelo Carregador, aqui ficará o elemento da tag que foi 
   *    // colocado no DOM
   *  
   * }
   */
  var body = null,
      configCache = {},
      configCacheRemoved = {},
      configNamePrefix = '__LazyLoaderPrefix_',
      configNamePrefixId = 1,
      logPrefix = 'LazyLoader: ';
  
  function _loadBody(){ 
    body = document.getElementsByTagName('body')[0]; 
  };
  
  //=====================  LazyLoader object  ======================
  var LazyLoader = {};
  
  LazyLoader.load = function( arr ){
    if( !(arr instanceof Array) ) return;
    if( !body ) _loadBody();
    for( var i = 0; i < arr.length; i++ ){
      body.appendChild( arr[i] );
    }
  };
  LazyLoader.script = function( scriptsArr, async, type ){
    if( async === undefined ) async = true;
    if( !type ) type = 'text/javascript';
    var arr = [];
    for( var i = 0; i < scriptsArr.length; i++ ){
      var tag = document.createElement('script');
      tag.type = type;
      tag.async = async;
      tag.src = scriptsArr[i];
      arr.push( tag );
    }
    return arr;
  };
  LazyLoader.css = function( scriptsArr, rel, type ){
    if( !rel ) rel = 'stylesheet';
    if( !type ) type = 'text/css';
    var arr = [];
    for( var i = 0; i < scriptsArr.length; i++ ){
      var tag = document.createElement('link');
      tag.type = type;
      tag.rel = rel;
      tag.href = scriptsArr[i];
      arr.push( tag );
    }
    return arr;
  };
  
  LazyLoader.insert = function( name ){
    var config = configCacheRemoved[name];
    if( !config ) return;
    if( !body ) _loadBody();
    body.appendChild( config._tag );
    configCache[name] = config;
    configCacheRemoved[name] = null;
  };
  LazyLoader.remove = function( name, clear ){
    var config = configCache[name];
    if( !config ) return;
    var parent = config._tag.parentElement;
    if( parent ) parent.removeChild( config._tag );
    if( !clear ) configCacheRemoved[name] = config;
    configCache[name] = null;
  };
  LazyLoader.clearRemoved = function(){
    configCacheRemoved = {};
  };
  LazyLoader.add = function( config ){
    if( !(config instanceof Object) ) return;
    if( !config.name ) config.name = configNamePrefix + configNamePrefixId++;
    if( configCache[config.name] || configCacheRemoved[config.name] ){
      window.console.error(logPrefix+'The config with name "'+ config.name +'" already exists! Call "remove( <name>, true )" to remove it.');
      return;
    }
    var tags = null;
    if( config.type === 'js' ) tags = LazyLoader.script( [config.tag.src || config.tag.href], config.async, config.type );
    else if( config.type === 'css' ) tags = LazyLoader.css( [config.tag.src || config.tag.href], config.rel, config.type );
    if( !tags || !tags.length ){
      window.console.error(logPrefix+'Config the "type" with "js" or "css".');
      return;
    }
    config._tag = tags[0];
    configCache[config.name] = config;
    if( config.predicates ){
      configCacheRemoved[config.name] = config;
      _check( config );
    }else LazyLoader.load( tags );
  };
  
  //=====================  window resize listener  ======================
  function _comp( arrComp, systemValue ){
    if( arrComp instanceof Function ) arrComp(  );
    else if ( arrComp instanceof Array ) switch( arrComp[0] ){
      case '!=': return systemValue !== arrComp[1]; break;
      case '=' : return systemValue === arrComp[1]; break;
      case '<' : return systemValue <   arrComp[1]; break;
      case '<=': return systemValue <=  arrComp[1]; break;
      case '>' : return systemValue >   arrComp[1]; break;
      case '>=': return systemValue >=  arrComp[1]; break;
    }
  }
  function _check( obj ){
    var pred = obj.predicates;
    if( 
      ( !pred.innerWidth || _comp(pred.innerWidth, window.innerWidth) )
      && ( !pred.innerHeight || _comp(pred.innerHeight, window.innerHeight) )
    ){
      LazyLoader.insert( obj.name );
    }else{
      LazyLoader.remove( obj.name );
    }
  }
  function _listenerFor( arrObj ){
    for( var g in arrObj ){
      var obj = arrObj[g];
      if( !obj || !obj.predicates ) continue;
      _check(obj);
    }
  }
  
  var timeout = null;
  function _listener( ev ){
    if( timeout ) clearTimeout( timeout );
    timeout = setTimeout(function(){
      _listenerFor( configCache );
      _listenerFor( configCacheRemoved );
    }, 50);
    
  }
  window.addEventListener('resize', _listener, false);
  
  //=====================  public LazyLoader object  ======================
  window.LazyLoader = LazyLoader;
})(window, document);
