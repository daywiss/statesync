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
  var methods = new Emitter()

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
    methods.emit('diff',{ method:action.method,path:path,value:methods.get(path) })
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

  return methods
}

// function State(state,clone,base){
//   //state tree
//   state = state || {}

//   //used to offset path for scopes
//   base = parsePath(base) || []

//   assert(lodash.isObject(state),'state must be null or an object')

//   //clone function for cloning values to and from state
//   clone = clone || function(x){return x}
//   assert(lodash.isFunction(clone),'clone must be null or a function')

//   var methods = new Emitter()

//   //subscriptions to children
//   var subscriptions = []

//   function emitChange(state,path,value){
//     methods.emit('change',clone(state),path,clone(value))
//     methods.emit('diff',path,value)
//     methods.emit(path,value)
//     // updateChildTree(children,path,value)
//   }

//   // function updateChild(child,path,value){
//   //   if(lodash.isNil(child)) return
//   //   child.patch(path,value,true)
//   // }
//   // function addChild(child,path){
//   //   var list = lodash.get(children,path)
//   //   list = list || []
//   //   list.push(child)
//   // }
//   // function updateChildTree(children,path,value){
//   //   lodash.reduce(path,function(path,append){
//   //     var list = lodash.get(children,path)
//   //     lodash.each(list,function(child){
//   //       updateChild(child,path,value)
//   //     })
//   //     path.push(append)
//   //     return path
//   //   },[path[0]])
//   // }

//   function parsePath(path){
//     assert(lodash.isNil(path) || 
//           lodash.isArray(path) ||
//           lodash.isString(path),
//           'path must be array, string, or null')
//     return lodash.toPath(path)
//   }

//   //use parse path before calling this
//   function pathWithBase(base,path){
//     if(lodash.isNil(path) || lodash.isEmpty(path)) return base
//     if(lodash.isNil(base) || lodash.isEmpty(base)) return path
//     return lodash.concat([base],path)
//   }

//   //clear keys from object
//   function clear(object){
//     lodash(object).keys().each(function(key){
//       lodash.unset(object,key)
//     })
//   }

//   methods.has = function(path){
//     path = pathWithBase(base,parsePath(path))
//     if(lodash.isEmpty(path)){
//       return true
//     }else{
//       return lodash.has(state,path)
//     }
//   }

//   methods.get = function(path,defaultValue){
//     path = pathWithBase(base,parsePath(path))
//     if(lodash.isEmpty(path)){
//       return clone(state)
//     }else{
//       return clone(lodash.get(state,path,defaultValue))
//     }
//   }

//   methods.set = function(path,value){
//     path = pathWithBase(base,parsePath(path))
//     assert(lodash.isEmpty(path) == false,'you cannot set an empty path')
//     if(lodash.isNil(value)){
//       lodash.unset(state,path)
//     }else{
//       lodash.set(state,path,value)
//     }
//     emitChange(state,path,value)
//     return clone(value)
//   }

//   methods.delete = function(path){
//     path = pathWithBase(base,parsePath(path))
//     if(lodash.isEmpty(path)){
//       clear(state)
//     }else{
//       lodash.unset(state,path)
//     }
//     emitChange(state,path)
//   }

//   // methods.do = function(action){
//   //   assert(action,'action must exist')
//   //   assert(action.method,'action.method must exist')
//   //   assert(action.method != do, 'cannot call do recursively')
//   //   var method = methods[action.method]
//   //   assert(method,'method does not exist')
//   //   return method.apply(null,action.args)
//   // }

//   methods.patch = function(path,value,emit){
//     // assert(lodash.isNil(path) == false,'patch path cannot be null')
//     path = pathWithBase(base,parsePath(path))
//     // var withBase = pathWithBase(path)
//     //delete or clear root
//     if(lodash.isEmpty(path) && lodash.isNil(value)){
//       clear(state)
//       methods.destroy()
//       return
//     }
//     //replace state completely
//     if(lodash.isEmpty(path)){
//       //value should be an object, might need to throw error if not
//       state = value
//       if(emit) emitChange(state,path,value)
//       return
//     }
//     //delete prop
//     if(lodash.isNil(value)){
//       lodash.unset(state,path)
//       if(emit) emitChange(state,path,value)
//       return 
//     }
//     //set prop
//     lodash.set(state,path,value)
//     if(emit) emitChange(state,path,value)
//   }

//   methods.scope = function(path,s){
//     path = pathWithBase(base,parsePath(path))
//     var scope = State(state,clone,path)
//     scope.on('diff',function(subpath,value){
//       methods.emitChange(state,pathWithBase(base,path),value)
//     })
//     methods.on('diff',function(path,value){
//     })

//     // if(lodash.isEmpty(path)){
//     //   s = state
//     // }else{
//     //   s = s || {}
//     // }

//     // //set child state
//     // var child = State(s,clone)
//     // //set local state to match
//     // lodash.set(state,path,s)

//     // //save child in our scope tree
//     // addChild(child,path)

//     // //listen to changes on child, propogate values up
//     // child.on('diff',function(subpath,value){
//     //   emitChange(pathWithBase(subpath,path),value)
//     // })

//     // //if parent is destoryed, kill children
//     // methods.on('destroyed',function(){
//     //   child.destroy()
//     // })


//     // function updateParent(p,v){
//     //   methods.patch(pathWithBase(p,path),v)
//     // }

//     // child.on('diff',updateParent)

//     // subscriptions.push(child.removeListener.bind(child,'diff',updateParent))

//     // //parent replaced child root, update child with new value
//     // methods.on(path,function(value){
//     //   child.patch(null,value)
//     // })


//     // if(lodash.isEmpty(path)){
//     //   child.patch(null,state)
//     // }else{
//     //   s = s || {}
//     //   assert(lodash.isObject(s),'state must be null or object')
//     //   child.patch(null,s)
//     //   methods.patch(path,s)
//     // }


//     // console.log(child.get(),lodash.get(state,path),path,s)
//     // assert(child.get() === lodash.get(state,path))
//     return child
//   }

//   //remove listeners mainly
//   methods.destroy = function(){
//     methods.emit('destroyed')
//     methods.removeAllListeners()
//   }

//   return methods
// }

