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
  lodash.set(state,rootName,root)

  function emitChange(state,path,value){
    methods.emit('change',state,path,value)
    methods.emit('diff',path,value)
  }

  function pathWithBase(path){
    if(lodash.isNil(path) || lodash.isEmpty(path)){
      return base
    }
    if(lodash.isArray(path)){
      return lodash.compact(lodash.concat([base],path)).join('.')
    }
    if(lodash.isString(path)){
      if(base){
        return base + '.' + path
      }else{
        return path
      }
    }
    assert(false,'unable to parse path, it can be an array, string or null')
  }

  function pathWithRoot(path){
    if(lodash.isNil(path) || lodash.isEmpty(path)) return rootName
    return rootName + '.' + path
  }

  methods.get = function(path){
    var withBase = pathWithBase(path)
    var withRoot = pathWithRoot(withBase)
    return clone(lodash.get(state,withRoot))
  }

  methods.set = function(path,value){
    var withBase = pathWithBase(path)
    var withRoot = pathWithRoot(withBase)
    value = clone(value)

    if(lodash.isNil(value)){
      lodash.unset(state,withRoot)
    }else{
      lodash.set(state,withRoot,value)
    }

    emitChange(clone(state[rootName]),withBase,value)
    return value
  }

  methods.delete = function(path){
    var withBase = pathWithBase(path)
    var withRoot = pathWithRoot(withBase)
    lodash.unset(state,withRoot)
    emitChange(clone(state[rootName]),withBase)
  }

  methods.patch = function(path,value){
    var withBase = pathWithBase(path)
    var withRoot = pathWithRoot(withBase)
    if(lodash.isNil(value)){
      lodash.unset(state,withRoot)
    }else{
      lodash.set(state,withRoot,value)
    }
  }

  methods.scope = function(path){
    var withBase = pathWithBase(path)
    var withRoot = pathWithRoot(withBase)
    //all scopes must start with an object that the parent is aware of
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

