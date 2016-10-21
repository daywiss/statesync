var assert = require('assert')
var lodash = require('lodash')
var Emitter = require('events')

module.exports = State

function State(root,clone,base){
  var methods = new Emitter()
  //holds all state
  var state = {}
  //key for root of state, required to make lodash get and set work cleanly
  var rootName = 'root'
  //secondary path to construct when accessing properties on state
  base = base || ''
  //clone function for cloning values to and from state
  clone = clone || function(x){return x}

  root = root || {}

  lodash.set(state,rootName,root)

  function emitChange(state,path,value){
    methods.emit('change',clone(state),path,clone(value))
    methods.emit('diff',path,value)
  }

  function parsePath(path){
    if(lodash.isNil(path)){
      return ''
    }
    if(lodash.isArray(path)){
      return path.join('.')
    }
    if(lodash.isString(path)){
      return path
    }
    assert(false,'unable to parse path, it can be an array, string or null')
  }

  function pathWithBase(path){
    if(lodash.isNil(path) || lodash.isEmpty(path)) return base
    if(lodash.isNil(base) || lodash.isEmpty(base)) return path
    return base + '.' + path
  }

  function pathWithRoot(path){
    if(lodash.isNil(path) || lodash.isEmpty(path)) return rootName
    return rootName + '.' + path
  }

  function clear(object){
    lodash(object).keys().each(function(key){
      lodash.unset(object,key)
    })
  }

  methods.get = function(path){
    path = parsePath(path)
    var withBase = pathWithBase(path)
    var withRoot = pathWithRoot(path)
    return clone(lodash.get(state,withRoot))
  }

  methods.set = function(path,value){
    assert(lodash.isNil(path) == false,'set path cannot be null')
    path = parsePath(path)
    var withBase = pathWithBase(path)
    var withRoot = pathWithRoot(path)
    if(lodash.isNil(value)){
      // clear(lodash.get(state,withRoot))
      // lodash.assign(lodash.get(state,withRoot),value)
      lodash.unset(state,withRoot)
    }else{
      lodash.set(state,withRoot,value)
    }
    emitChange(state[rootName],withBase,value)
    return clone(value)
  }

  methods.delete = function(path){
    path = parsePath(path)
    var withBase = pathWithBase(path)
    var withRoot = pathWithRoot(path)
    if(lodash.isEmpty(path)){
      clear(lodash.get(state,withRoot))
    }else{
      lodash.unset(state,withRoot)
    }
    emitChange(state[rootName],withBase)
  }

  methods.patch = function(path,value){
    // assert(lodash.isNil(path) == false,'patch path cannot be null')
    path = parsePath(path)
    var withBase = pathWithBase(path)
    var withRoot = pathWithRoot(withBase)
    //delete or clear root
    if(lodash.isNil(path)){
      clear(lodash.get(state,withRoot))
      return
    }
    //delete prop
    if(lodash.isNil(value)){
      lodash.unset(state,withRoot)
      return 
    }
    //set prop
    lodash.set(state,withRoot,value)
  }

  methods.scope = function(path){
    path = parsePath(path)
    var withRoot = pathWithRoot(path)
    //all scopes must start with an object that the parent is aware of it
    //using lodash methods rather than local ones for slightly better perf
    if(lodash.get(state,withRoot) == null){
      lodash.set(state,withRoot,{})
    }
    var child = State(lodash.get(state,withRoot),clone,base)
    child.on('change',function(state,path,value){
      emitChange(state,pathWithBase(path),value)
    })
    return child
  }
  return methods
}

