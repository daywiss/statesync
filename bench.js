const lodash = require('lodash')
const Events = require('events')
const State = require('.')
const StatePerf = require('./statesync-perf')
const copy = require('fast-copy').default
const {deepEqual} = require('fast-equals')

function clone(x){
  return copy(x)
}

function equal(x){
  // console.log(deepEqual)
  return deepEqual(x)
}

const count = 1000

const data = lodash.times(count,i=>{
  return {
    id:'id' + i,
    name:'name' + i,
    desc:'desc' + i,
    text:' Same as set, but will not cause events to fire. This will also cause values not to replicate with diff.  Use only under special circumstances. You can specify true to change or diff to allow one or the other or both events to fire.'
  }
})

console.time('baseline')
  state = State({})
  data.forEach(val=>{
    //do nothing
    state.set(val.id,val)
  })
console.timeEnd('baseline')

console.time('set')
state = State({})
state.on('change',x=>x)
state.on(['data'],x=>x)
data.forEach(val=>{
  state.set(['data',val.id],val)
})
console.timeEnd('set')


console.time('set with clone')
state = State({},clone)
state.on('change',x=>x)
state.on(['data'],x=>x)
data.forEach(val=>{
  state.set(['data',val.id],val)
})
console.timeEnd('set with clone')

console.time('set with clone and equality')
state = State({},clone, equal)
state.on('change',x=>x)
state.on(['data'],x=>x)
data.forEach(val=>{
  state.set(['data',val.id],val)
})
console.timeEnd('set with clone and equality')

console.time('setSilent')
state = State({})
state.on('change',x=>x)
state.on(['data'],x=>x)
data.forEach(val=>{
  state.setSilent(['data',val.id],val)
})
console.timeEnd('setSilent')

console.time('setSilent with clone')
state = State({},clone)
state.on('change',x=>x)
state.on(['data'],x=>x)
data.forEach(val=>{
  state.setSilent(['data',val.id],val)
})
console.timeEnd('setSilent with clone')

console.time('setSilent with clone and equality')
state = State({},clone,equal)
state.on('change',x=>x)
state.on(['data'],x=>x)
data.forEach(val=>{
  state.setSilent(['data',val.id],val)
})
console.timeEnd('setSilent with clone and equality')

console.time('set perf')
state = StatePerf({})
state.on('change',x=>x)
state.on(['data'],x=>x)
data.forEach(val=>{
  state.set(['data',val.id],val)
})
console.timeEnd('set perf')

console.time('set perf with clone')
state = StatePerf({},clone)
state.on('change',x=>x)
state.on(['data'],x=>x)
data.forEach(val=>{
  state.set(['data',val.id],val)
})
console.timeEnd('set perf with clone')

console.time('set perf with clone and equality')
state = StatePerf({},clone,equal)
state.on('change',x=>x)
state.on(['data'],x=>x)
data.forEach(val=>{
  state.set(['data',val.id],val)
})
console.timeEnd('set perf with clone and equality')
