var assert = require('assert')
var lodash = require('lodash')
var Emitter = require('events')

module.exports = State

function State(root,clone,base){
  var methods = new Emitter()
  //holds all state
  var state = root || {}
  //secondary path to construct when accessing properties on state
  base = base || ''
  //clone function for cloning values to and from state
  clone = clone || function(x){return x}

  function emitChange(state,path,value){
    methods.emit('change',clone(state),path,clone(value))
    methods.emit('diff',path,value)
  }

  function parsePath(path){
    if(lodash.isNil(path)){
      return ''
    }
    if(lodash.isArray(path)){
      return path
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

  function clear(object){
    lodash(object).keys().each(function(key){
      lodash.unset(object,key)
    })
  }

  methods.get = function(path,defaultValue){
    path = parsePath(path)
    if(lodash.isEmpty(path)){
      return clone(state)
    }else{
      return clone(lodash.get(state,path,defaultValue))
    }
  }

  methods.set = function(path,value){
    assert(lodash.isNil(path) == false,'set path cannot be null')
    path = parsePath(path)
    var withBase = pathWithBase(path)
    if(lodash.isNil(value)){
      lodash.unset(state,path)
    }else{
      lodash.set(state,path,value)
    }
    emitChange(state,withBase,value)
    return clone(value)
  }

  methods.delete = function(path){
    path = parsePath(path)
    var withBase = pathWithBase(path)
    if(lodash.isEmpty(path)){
      clear(state)
    }else{
      lodash.unset(state,path)
    }
    emitChange(state,withBase)
  }

  methods.patch = function(path,value){
    // assert(lodash.isNil(path) == false,'patch path cannot be null')
    path = parsePath(path)
    var withBase = pathWithBase(path)
    //delete or clear root
    if(lodash.isNil(path)){
      clear(state)
      return
    }
    //delete prop
    if(lodash.isNil(value)){
      lodash.unset(state,path)
      return 
    }
    //set prop
    lodash.set(state,path,value)
  }

  methods.scope = function(path){
    path = parsePath(path)
    //all scopes must start with an object that the parent is aware of it
    //using lodash methods rather than local ones for slightly better perf
    if(lodash.get(state,path) == null){
      lodash.set(state,path,{})
    }
    var child = State(lodash.get(state,path),clone,base)
    child.on('change',function(state,path,value){
      emitChange(state,pathWithBase(path),value)
    })
    return child
  }
  return methods
}

