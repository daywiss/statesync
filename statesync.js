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
  castArray:require('lodash/castArray'),
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
    methods.emit('message',{type:'change',path,value})
  }
  function emitDiff(method,path,value){
    methods.emit('message',{type:'diff', method:method,path:path,value:value })
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
    // console.log(path,value,val)
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

  const paths = new Map()

  function handleRootChange({value},path){
    const blob = methods.get()
    // const blob = fastGet()
    if(methods.eventNames){
      emitOnPaths_v2(path,value,blob)
    }else{
      methods.emit('change',blob,safeGet(blob,path),path)
      emitOnPaths(path,value,path,blob)
    }
  }

  function safeGet(state,path=[],def){
    if(path.length == 0) return state
    return lodash.get(state,path,def)
  }

  function fastGet(path,defaultValue){
    path = pathWithBase(path)
    defaultValue = defaultValue
    return root.get(path,defaultValue)
  }              

  function emitOnPaths_v2(path,value,blob){
    assert(methods.eventNames,'This function only works in Node v6 or greater')
    methods.eventNames().forEach(name=>{
      // console.log('allpaths',nameArray,path)
      //ignore diff and change listeners
      if(name === 'diff') return
      if(name === 'change'){
        // console.log('change',blob,safeGet(blob,path),path)
        return methods.emit('change',blob,safeGet(blob,path),path)
      }
      //seems like arrays as events get stringified into comma delim words
      const nameArray = name.split(',')
      if(wasPathTouched(path,nameArray)){
        // console.log(nameArray,blob)
        // console.log('keychange',name,safeGet(blob,nameArray),value,path)
        methods.emit(name,safeGet(blob,nameArray),value,path)
      }
    })
  }


  function emitOnPaths(path,value,originalPath,blob){
    //fallback to non exhaustive emit
    if(!lodash.isEmpty(methods.listeners(path))){
      methods.emit(path,safeGet(blob,path),value,originalPath)
    }
    if(lodash.isEmpty(path)) return 
    emitOnPaths(path.slice(0,-1),value,originalPath,blob)
  }


  function handleRootDiff(action,path){
    methods.emit('diff',{method:action.method,path:path,value:action.value})
  }

  function handleRootMessage(msg){
    const path = wasPathTouched(msg.path,base)
    if(path === false) return
    if(msg.type === 'diff'){
      return handleRootDiff(msg,path)
    }
    if(msg.type === 'change'){
      return handleRootChange(msg,path)
    }
  }

  root.on('message',handleRootMessage)

  //cases where path changes on our branch and we emit:
  //root changes, emit
  //path changes on us exactly, emit
  //path changes on one of our children, emit
  //path changes on a direct parent above us, emit
  //a path changes on the way to us, but branches of before us, dont emit
  //in all cases i think if one or the other path is consumed, we emit
  function wasPathTouched(path,base){
    let index = 0
    do{
      if(index >= path.length) return base.slice(index)
      //if we are root, then we always change
      if(index >= base.length) return path.slice(index)
      // console.log(path,base,index,path[index],base[index])
      if(path[index] == base[index]){
        index++
      }else{
        return false
      }
    }while(true)
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

  methods.setSilent = function(path,value,change=false,diff=false){
    path = pathWithBase(path)
    value = clone(value)
    if(equals(value,root.get(path))){
      return value
    }
    return root.set(path,value,change,diff)
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
    root.removeListener('message',handleRootDiff)
    methods.removeAllListeners()
  }

  methods.statesync = true

  methods.path = function(){
    return base
  }

  methods.onPath = (path,cb) =>{
    path = lodash.toPath(path)
    paths.set(path.join('.'),{
      path,cb
    })
  }

  return methods
}

