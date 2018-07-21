var assert = require('assert')
var Emitter = require('events')

//include only functions used. help client side builds.
var lodash = {
  get:require('lodash/get'),
  set:require('lodash/set'),
  has:require('lodash/has'),
  unset:require('lodash/unset'),
  isObject:require('lodash/isObject'),
  isFunction:require('lodash/isFunction'),
  isArray:require('lodash/isArray'),
  isEqual:require('lodash/isEqual'),
  isEmpty:require('lodash/isEmpty'),
  keys:require('lodash/keys'),
  each:require('lodash/each'),
  stubFalse:require('lodash/stubFalse'),
  toPath:require('lodash/toPath'),
  concat:require('lodash/concat'),
  merge:require('lodash/merge'),
}

module.exports = Root

//internal functions to manipulate state
function Root(state,clone,equals){
  //state tree
  state = state || {}
  assert(lodash.isObject(state),'state must be null or an object')
  //clone function for cloning values to and from state
  clone = clone || function(x){return x}
  equals = equals || lodash.stubFalse
  assert(lodash.isFunction(clone),'clone must be null or a function')

  var methods = new Emitter()
  var children = {}

  function emitChange(path,value){
    methods.emit('change',path,value)
  }
  function emitDiff(method,path,value){
    methods.emit('diff',{ method:method,path:path,value:value })
  }


  function clear(object){
    var keys = lodash.keys(object)
    lodash.each(keys,function(key){
      lodash.unset(object,key)
    })
  }

  methods.emitDiff = emitDiff
  methods.emitChange = emitChange

  methods.has = function(path){
    if(lodash.isEmpty(path)){
      return true
    }else{
      return lodash.has(state,path)
    }
  }

  methods.get = function(path,defaultValue){
    if(lodash.isEmpty(path)){
      return state
    }else{
      return lodash.get(state,path,defaultValue)
    }
  }

  methods.set = function(path,value,emitchange,emitdiff){
    if(lodash.isEmpty(path)){
      //replaces state object, use at risk
      state = value
    }else{
      lodash.set(state,path,value)
    }

    if(emitchange){
      emitChange(path,value) 
    }
    if(emitdiff){
      emitDiff('set',path,value) 
    }
    return value
  }

  //value parameter added to keep same signature as set,required for patch to work
  methods.delete = function(path,value,emitchange,emitdiff){
    if(lodash.isEmpty(path)){
      //clear state without replacing object
      clear(state)
    }else{
      lodash.unset(state,path)
    }
    if(emitchange){
      emitChange(path,null)
    }
    if(emitdiff){
      emitDiff('delete',path) 

    }
  }

  methods.push = function(path,value,emitchange,emitdiff){
    var val = methods.get(path,[])
    console.log(path,value,val)
    var result = val.push(value)

    //silently set
    methods.set(path,val)

    if(emitchange){
      emitChange(path,val)
    }
    if(emitdiff){
      emitDiff('push',path,value) 
    }

    return result
  }

  methods.concat = function(path,value,emitchange,emitdiff){
    var val = methods.get(path,[])
    var result = lodash.concat(val,value)

    //silently set
    methods.set(path,result)

    if(emitchange){
      emitChange(path,result)
    }
    if(emitdiff){
      emitDiff('concat',path,value) 
    }
    return result
  }

  methods.unshift = function(path,value,emitchange,emitdiff){
    var val = methods.get(path,[])
    var result = val.unshift(value)

    //silently set
    methods.set(path,val)

    if(emitchange){
      emitChange(path,val)
    }
    if(emitdiff){
      emitDiff('unshift',path,value) 
    }
    return result
  }
  
  methods.shift = function(path,value,emitchange,emitdiff){
    var val = methods.get(path,[])
    var result = val.shift(value)

    //silently set
    methods.set(path,val)

    if(emitchange){
      emitChange(path,val)
    }
    if(emitdiff){
      emitDiff('shift',path,null) 
    }
    return result
  }

  methods.pop = function(path,value,emitchange,emitdiff){
    var pop = methods.get(path,[]).pop()
    var val = methods.get(path)
    if(emitchange){
      emitChange(path,val)
    }
    if(emitdiff){
      emitDiff('pop',path,null) 
    }
    return val
  }

  methods.patch = function(diff,emitDiff){
    emitDiff = emitDiff || false
    return methods[diff.method](diff.path,diff.value,true,emitDiff)
  }

  methods.scope = function(path,value,cl,eq){
    var scope = Scope(methods, path, cl || clone,eq || equals)
    methods.set(path,value || methods.get(path))
    return scope
  }

  return methods.scope([],state,clone,equals)

}
//this is the api users interact with
function Scope(root,base,clone,equals){
  assert(root,'requires state root')
  base = lodash.toPath(base)
  // var methods = new Emitter()

  function methods(path,defaultValue){
    return methods.get(path,defaultValue)
  }
  //this seems to work...
  lodash.merge(methods,new Emitter())

  function handleRootChange(path,value){
    //check if path affects us
    //emit appropriate events
    path = wasPathTouched(path,base)
    if(path === false) return
    methods.emit('change',methods.get(),methods.get(path),path)

    if(methods.eventNames){
      emitOnPaths_v2(path,value)
      // emitOnPaths(path,value,path)
    }else{
      emitOnPaths(path,value,path)
    }
  }

  function emitOnPaths_v2(path,value){
    assert(methods.eventNames,'This function only works in Node v6 or greater')
    lodash.each(methods.eventNames(),function(name){
      // console.log('allpaths',nameArray,path)
      //ignore diff and change listeners
      if(name === 'change') return
      if(name === 'diff') return
      //seems like arrays as events get stringified into comma delim words
      nameArray = name.split(',')
      if(wasPathTouched(path,nameArray)){
        // console.log('nameArray',nameArray,methods.get(name))
        methods.emit(name,methods.get(nameArray),value,path)
      }
    })
  }
  function emitOnPaths(path,value,originalPath){
    //fallback to non exhaustive emit
    if(!lodash.isEmpty(methods.listeners(path))){
      methods.emit(path,methods.get(path),value,originalPath)
    }
    if(lodash.isEmpty(path)) return 
    emitOnPaths(path.slice(0,-1),value,originalPath)
  }


  function handleRootDiff(action){
    var path = wasPathTouched(action.path,base)
    if(path === false) return
    methods.emit('diff',{method:action.method,path:path,value:action.value})
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
    // console.log(path,base)
    //path is empty, which means root was changed
    if(lodash.isEmpty(path)) return base
    //if we are root, then we always change
    if(lodash.isEmpty(base)) return path
    //check if most significant branch matches and recurse
    if(path[0] == base[0]) return wasPathTouched(path.slice(1),base.slice(1))
    //most significant branch does nto match, and neither path was consumed completely
    return false
  }

  //concat base with path
  function pathWithBase(path){
    path = lodash.toPath(path)
    if(lodash.isEmpty(path)) return base
    if(lodash.isEmpty(base)) return path
    return lodash.concat(base,path)
  }

  //these functions would be good candidate for 
  //lodash.overArgs, but overArgs will not pass
  //null parameters through
  methods.has = function(path){
    path = pathWithBase(path)
    return root.has(path)
  }

  methods.get = function(path,defaultValue){
    path = pathWithBase(path)
    defaultValue = clone(defaultValue)
    return clone(root.get(path,defaultValue))
  }

  methods.set = function(path,value){
    path = pathWithBase(path)
    value = clone(value)
    if(equals(value,root.get(path))){
      return value
    }
    return root.set(path,value,true,true)
  }

  methods.delete = function(path){
    path = pathWithBase(path)
    return root.delete(path,null,true,true)
  }

  methods.push = function(path,value){
    path = pathWithBase(path)
    value = clone(value)
    return root.push(path,value,true,true)
  }

  methods.pop = function(path){
    path = pathWithBase(path)
    return root.pop(path,null,true,true)
  }

  methods.concat = function(path,value){
    path = pathWithBase(path)
    value = clone(value)
    return root.concat(path,value,true,true)
  }
  
  methods.unshift = function(path,value){
    path = pathWithBase(path)
    value = clone(value)
    return root.unshift(path,value,true,true)
  }

  methods.shift = function(path){
    path = pathWithBase(path)
    return root.shift(path,null,true,true)
  }

  methods.patch =  function(diff){
    var copy = {
      method: diff.method,
      path : pathWithBase(diff.path),
      value : diff.value
    }

    if(equals(copy.value,root.get(copy.path))){
      return copy.value
    }

    return root.patch(copy,true)
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
    methods.removeAllListeners()
  }

  methods.statesync = true

  methods.path = function(){
    return base
  }

  return methods
}

