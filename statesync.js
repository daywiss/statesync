var assert = require('assert')
var lodash = require('lodash')
var Emitter = require('events')

module.exports = Root

function Root(state,clone){
  //state tree
  state = state || {}
  assert(lodash.isObject(state),'state must be null or an object')
  //clone function for cloning values to and from state
  clone = clone || function(x){return x}
  assert(lodash.isFunction(clone),'clone must be null or a function')

  var methods = new Emitter()
  var children = {}

  function emitChange(path){
    methods.emit('change',path)
  }
  function emitDiff(method,path,value){
    methods.emit('diff',{ method:method,path:path,value:value })
  }

  methods.has = function(path){
    if(lodash.isEmpty(path)){
      return true
    }else{
      return lodash.has(state,path)
    }
  }

  methods.get = function(path,defaultValue){
    // console.log('get',path,defaultValue,state)
    if(lodash.isEmpty(path)){
      return state
    }else{
      return lodash.get(state,path,defaultValue)
    }
  }

  methods.set = function(path,value,emit){
    if(lodash.isEmpty(path)){
      state = value
    }else{
      lodash.set(state,path,value)
    }

    if(emit){
      emitChange(path) 
      emitDiff('set',path,value) 
    }
    // console.log('set',path,value)
    return value
  }

  methods.delete = function(path,emit){
    if(lodash.isEmpty(path)){
      state = null
    }else{
      lodash.unset(state,path)
    }
    if(emit){
      emitChange(path,null)
      emitDiff('delete',path) 
    }
  }

  methods.patch = function(diff){
    console.log(diff)
    return methods[diff.method](diff.path,diff.value,false)
  }

  methods.scope = function(path,value){
    var scope = Scope(methods,path,clone)
    methods.set(path,value || methods.get(path))
    return scope
  }

  return methods.scope([],state)

}
function Scope(root,base,clone){
  assert(root,'requires state root')
  base = parsePath(base)
  // var methods = new Emitter()

  function methods(path){
    return methods.get(path)
  }
  //this seems to work...
  lodash.merge(methods,new Emitter())

  function handleRootChange(path,value){
    //check if path affects us
    //emit appropriate events
    path = wasPathTouched(path,base)
    if(path == false) return
    methods.emit('change',methods.get(),path)
  }

  function handleRootDiff(action){
    var path = wasPathTouched(action.path,base)
    if(path == false) return
    var value = methods.get(path)
    methods.emit('diff',{ method:action.method,path:path,value:value})
    methods.emit(path,value,path)
  }

  root.on('change',handleRootChange)
  root.on('diff',handleRootDiff)


  //cases where path changes on our branch and we emit:
  //root changes, emit
  //path changes on us exactly, emit
  //path changes on one of our children, emit
  //path changes on a direct parent above us, emit
  //a path changes on the way to us, but branches of before us, dont emit
  //in all cases i think if one or the other path is consumed, we emit
  function wasPathTouched(path,base){
    //path is empty, which means root was changed
    if(lodash.isEmpty(path)) return base
    //if we are root, then we always change
    if(lodash.isEmpty(base)) return path
    //check if most significant branch matches and recurse
    if(path[0] == base[0]) return wasPathTouched(path.slice(1),base.slice(1))
    //most significant branch does nto match, and neither path was consumed completely
    return false
  }

  function parsePath(path){
    assert(lodash.isNil(path) || 
          lodash.isArray(path) ||
          lodash.isString(path),
          'path must be array, string, or null')
    return lodash.toPath(path)
  }
  function pathWithBase(path){
    path = parsePath(path)
    if(lodash.isEmpty(path)) return base
    if(lodash.isEmpty(base)) return path
    return lodash.concat(base,path)
  }

  methods.has = lodash.overArgs(function(path){
    return root.has(path)
  },[pathWithBase])

  methods.get = function(path,defaultValue){
    path = pathWithBase(path)
    defaultValue = clone(defaultValue)
    return clone(root.get(path,defaultValue))
  }

  methods.set = function(path,value){
    path = pathWithBase(path)
    value = clone(value)
    return root.set(path,value,true)
  }

  methods.delete = function(path){
    path = pathWithBase(path)
    return root.delete(path,true)
  }

  methods.patch =  function(diff){
    diff.path = pathWithBase(diff.path)
    return root.patch(diff)
  }

  methods.scope = function(path,value){
    path = pathWithBase(path)
    value = clone(value)
    return root.scope(path,value)
  }

  methods.root = function(){
    return root.get()
  }

  //disconnect scope from root, no more events
  methods.disconnect = function(){
    root.removeListener('diff',handleRootDiff)
    root.removeListener('change',handleRootChange)
  }

  methods.type = 'statesync'

  methods.path = function(){
    return base
  }

  return methods
}

