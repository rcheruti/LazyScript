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
   *    // se não for informado, a string usada em "src" será usada como nome
   *  remove: 'boolean' true : informa se a tag pode ser removida após colocada na página,
   *    // isso acontecerá quando uma das restrições/predicados informar falso para essa tag
   *  type : 'string' 'css' : informa o tipo de tag que será usado
   *    // valores disponíveis: 'js', 'css'
   *  src: 'string' : o link a ser carregado
   *  
   *  predicates: 'object' {} : informa as restrições dessa configuração
   *    {
   *      innerHeight: 'array|function' [ 'string', 'number' ] : verifica com o valor de "window.innerHeight"
   *      innerWidth: 'array|function' [ 'string', 'number' ] : verifica com o valor de "window.innerWidth"
   *      f: 'function' : função para ser executada para verificar, deve retornar um 'boolean'
   *      colorDepth: 'array|function' [ 'string', 'number' ] : verifica com o valor de "window.screen.colorDepth"
   *    }
   *  
   *  tag: 'object' : informações da tag que será usada, a configuração da tag que será usada não é possível
   *    {
   *      rel: 'string' 'stylesheet' : para css, informa o campo "rel" da tag "link"
   *      type: 'string' 'text/css|text/javascript': informa o campo "type" da tag
   *      async: 'boolean' true : para script, informa o campo "async" (html5) da tag "script"
   *    }
   *  _tag: 'DomNode' : criado pelo Carregador, aqui ficará o elemento da tag que foi 
   *    // colocado no DOM
   *  _inserted: 'boolean' : criado pelo Carregador, informa se o elemento está inserido no DOM
   *  
   * }
   */
  var body = null,
      configCache = {},
      configCacheRemoved = {},
      logPrefix = 'LazyLoader: ',
      dJsType = 'text/javascript',
      dCssType = 'text/css',
      dJsRel = 'script',
      dCssRel = 'stylesheet';
  
  
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
    if( typeof async === 'undefined' ) async = true;
    if( !type ) type = dJsType;
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
    if( !rel ) rel = dCssRel;
    if( !type ) type = dCssType;
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
    config._inserted = true;
    configCache[name] = config;
    configCacheRemoved[name] = null;
  };
  LazyLoader.remove = function( name, clear ){
    var config = configCache[name];
    if( !config ) return;
    var parent = config._tag.parentElement;
    if( parent ) parent.removeChild( config._tag );
    config._inserted = false;
    if( !clear ) configCacheRemoved[name] = config;
    configCache[name] = null;
  };
  LazyLoader.clearRemoved = function(){
    configCacheRemoved = {};
  };
  LazyLoader.add = function( config ){
    if( !(typeof config === 'object') ) return;
    if( !config.name ) config.name = config.src;
    if( configCache[config.name] || configCacheRemoved[config.name] ){
      window.console.error(logPrefix+'The config with name "'+ config.name +'" already exists! Call "remove( <name>, true )" to remove it.');
      return;
    }
    if( !config.type ) config.type = 'css';
    if( !config.tag ) config.tag = { };
    if( typeof config.tag.async === 'undefined' ) config.tag.async = true;
    if( !config.tag.rel ) config.tag.rel = config.type === 'js'? dJsRel : dCssRel;
    if( !config.tag.type ) config.tag.type = config.type === 'js'? dJsType : dCssType;
    var tags = null;
    if( config.type === 'js' ) tags = LazyLoader.script( [config.src ], config.tag.async, config.tag.type );
    else if( config.type === 'css' ) tags = LazyLoader.css( [config.src ], config.tag.rel, config.tag.type );
    if( !tags || !tags.length ){
      window.console.error(logPrefix+'Config the "type" with "js" or "css".');
      return;
    }
    if( config.remove === undefined ) config.remove = true;
    config._tag = tags[0];
    configCache[config.name] = config;
    if( config.predicates ){
      configCacheRemoved[config.name] = config;
      _check( config );
    }else LazyLoader.load( tags );
  };
  
  LazyLoader.refresh = function(){
    _listener();
  };
  
  //=====================  window resize listener  ======================
  function _comp( arrComp, systemValue ){
    if( typeof arrComp === 'function' ) return arrComp(  );
    else if ( arrComp instanceof Array ) switch( arrComp[0] ){
      case '!=': return systemValue !== arrComp[1]; break;
      case '=' : return systemValue === arrComp[1]; break;
      case '<' : return systemValue <   arrComp[1]; break;
      case '<=': return systemValue <=  arrComp[1]; break;
      case '>' : return systemValue >   arrComp[1]; break;
      case '>=': return systemValue >=  arrComp[1]; break;
    }
    return false;
  }
  function _check( config ){
    var pred = config.predicates;
    if( config._inserted && !config.remove ) return;
    if( 
         ( !pred.innerWidth || _comp(pred.innerWidth, window.innerWidth) )
      && ( !pred.innerHeight || _comp(pred.innerHeight, window.innerHeight) )
      && ( !pred.f || _comp(pred.f, null) )
    ){
      LazyLoader.insert( config.name );
    }else{
      LazyLoader.remove( config.name );
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
  function _listener(  ){
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
