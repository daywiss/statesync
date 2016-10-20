var assert = require('assert')
var lodash = require('lodash')
var Emitter = require('events')

function table(value){
  var methods = new Emitter()
  var state = {}

  function emitChange(key,value,state){
    methods.emit('change',key,value,lodash.cloneDeep(state))
  }

  methods.init = function(value){
    value = value || {}
    state = lodash.cloneDeep(value) 
    emitChange(null,value,state) 
    return methods
  }

  methods.get = function(key){
    if(key == null) return lodash.cloneDeep(state)
    return lodash.cloneDeep(lodash.get(state,key))
  }

  methods.set = function(key,value){
    value = lodash.cloneDeep(value)
    if(key == null){
      methods.init(value)
      return state
    }
    lodash.set(state,key,value)
    emitChange(key,value,state)
    return value
  }

  methods.delete = function(key){
    if(key == null) state = {}
    lodash.unset(state,key)
    emitChange(key,null,state)
    return true
  }
  
  return methods.init(value)
}

module.exports = function(){
  var states = {}
  var methods = new Emitter()

  function changeHandler(id,key,value,state){
    methods.emit('change',id,key,value,state)
  }

  methods.get = function(id){
    var state = states[id]
    assert(state,'state with this id does not exist')
    return state
  }
  methods.create = function(id,value){
    assert(states[id] == null,'this key has a state already associated with it')
    var state = table(value)
    states[id] = state
    state.on('change',changeHandler.bind(null,id))
    return state
  }

  methods.patch = function(id,key,value){
    var state = null
    try{
      state = methods.get(id)
    }catch(e){
      state = methods.create(id)
    }
    if(value === null){
      state.delete(key)
    }else{             
      state.set(key,value)
    }
  }
  return methods
}

