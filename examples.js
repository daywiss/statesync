var test = require('tape')
var State = require('.')
var assert = require('assert')

test('examples',function(t){
  t.test('basic case',function(t){
    var state = State()
    var value = state.set('key','value')
    //get the value
    assert.equal(state.get('key'),value)
    //this is equivalent to get
    assert.equal(state('key'),value)

    //get the root state object for read only purposes
    assert(state.get().key,value)
    assert(state().key,value)

    //delete the key value
    state.delete('key')
    //or state.set('key',null)
    assert.equal(state.get('key'),undefined)
    
    //clear all keys in state
    state.delete()
    t.end()
  })

  t.test('deep inspection',function(t){
    var state = State()
    //set some key value
    state.set('this.is.a.deep.value','true')

    //various ways(but not exhuastive) to get a value
    state.get('this.is.a.deep.value')
    state().this.is.a.deep.value
    state.get(['this','is','a','deep','value'])
    state.get()['this']['is']['a']['deep']['value']
    state('this.is.a.deep.value')
    state(['this','is','a','deep','value'])

    //delete the key value
    state.delete('this.is.a.deep.value')
    t.end()
  })

  t.test('events',function(t){
    var state = State()
    //trigger this only once then unsubscribe
    state.once('change',function(state,value,key){
      //state is the entire state from root 
      assert.deepEqual(state,{ greeting:'hello' })

      //key is the key path which was changed, as an array
      assert.deepEqual(key,['greeting'])

      //value is the value that changed at the key
      assert.equal(value,'hello')
    })

    //to listen to a key path, use array notation
    //this will emit any time this path, or subpath changes
    state.on(['deep','key'],function(state,value,key){

      //value which was changed at path
      assert.equal(state,'secret')
      //in this case the value that caused emit is the same as the value of the path
      assert.equal(value,state)

      //key path which changed, as an array
      assert(key,['deep','key'])
    })

    state.set('greeting','hello')

    state.set('deep.key','secret')
    t.end()
  })
  t.test('internal state',function(t){
    //state pointer will remain a reference to the internal state object
    var statePointer = {
      created:Date.now()  //any initialized data can be placed here
    }

    //first parameter will let you keep handle to internal state for read only purposes
    var state = State(statePointer)

    state.once('change',function(state,value,key){
      //state is the same as our statePointer
      assert.deepEqual(state,statePointer)
      assert.equal(state.read,'me')
      assert.equal(key,'read')
      assert.equal(value,'me')
      assert(state===statePointer)
    })

    state.set('read','me')

    //set has the ability to overwrite the root object with whatever value you want
    //but you will lose your external reference
    state.set(null,{})

    assert(statePointer !== state())

    //so get it back using root()
    statePointer = state.root()

    //if you only want to clear all properties from 
    //the root object without losing external reference it, use delete()

    state.delete()
    t.end()
  })
  t.test('immutability',function(){
    var lodash = require('lodash')

    //second parameter is a custom clone function which gets applied to all gets, sets, deletes and events
    var state = State(null,lodash.cloneDeep)

    state.on('change',function(state,value,key){
      assert.deepEqual(languages,state.languages)
      assert.notEqual(languages, state.languages)
      assert.equal(key,'languages')
      assert.deepEqual(value,languages)
    })

    var languages = [ 'javascript' ]

    state.set('languages',languages)

    //lodash.cloneDeep should keep the internal state safe from this outside mutation
    //by default this would corrupt our state
    languages.push('java')

    assert.notEqual(languages.length,state.get('languages').length)
    t.end()
  })
  t.test('scopes',function(t){
    var defaultState = {
      redteam:{},
      blueteam:{},
      hiddencolor:{
        yellowteam:{}
      }
    }

    var state = State(defaultState)

    var redteam = state.scope('redteam')
    var blueteam = state.scope('blueteam')
    var yellowteam = state.scope('hiddencolor.yellowteam')

    redteam.set('votes',10)
    blueteam.set('votes',11)
    //each one of these can be scoped further as well

    //red and blue scopes are references to the root states objects
    //unless a clone function is supplied
    assert.deepEqual(redteam.get(),defaultState.redteam)
    assert.deepEqual(blueteam.get(),defaultState.blueteam)
    
    //this is allowed because child scope listens for changes on parent when it affects its root
    state.set('redteam',{votes:12})
    //this is also ok
    state.set('redteam.votes',12)

    //deeper elements will also be properly updated
    //this will cause yellowteam to emit a change event that its value is now undefined
    state.set('hiddencolor',{greenteam:{}})

    //yellow teams parent property, "hiddencolor" was overriden, and now will be undefined
    assert.equal(yellowteam(),null)
    t.end()
  
  })
  t.test('replication',function(t){
    var server = State()
    var client = State()

    server.on('diff',client.patch)
    client.on('diff',server.patch)

    client.set('clientkey','clientsecret')
    server.set('serverkey','serversecret')

    //client and server now share the same state
    assert.deepEqual(client.get(),server.get())
    t.end()
  })

})
