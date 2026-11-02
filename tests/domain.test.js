import test from 'node:test';
import assert from 'node:assert/strict';
import {createMetric,addObservation,changeTarget,compareMetric,parseValue,getCurrent,getTarget,describeGap,emptyWorkspace,createArea,metricsInArea,demoWorkspace,metricProgress,normalizeMetricOrders,orderedGoldMetrics,moveMetric} from '../src/domain.js';
const sample=(type,desired,initial,extra={})=>createMetric({areaId:'test',title:'Test',kind:'standard',type,desired,initial,...extra});
test('new workspace is blank and allows any custom folder',()=>{assert.equal(emptyWorkspace().areas.length,0);assert.equal(createArea('Πειράματα').name,'Πειράματα');});
test('missing actual is unknown, not zero',()=>assert.equal(compareMetric(sample('number','4')).status,'unknown'));
test('count: 1 vs 4 gives a 3-unit gap',()=>{const m=sample('number','4','1');const c=compareMetric(m);assert.equal(c.status,'unmet');assert.equal(c.gap,3);assert.match(describeGap(m,c),/3/);});
test('boolean mismatch is not numeric',()=>{const c=compareMetric(sample('boolean','yes','no'));assert.equal(c.status,'unmet');assert.equal(c.gap,null);});
test('frequency 1/week vs 2/week, clearly self-reported',()=>{const m=sample('frequency','2','1',{period:'week'});assert.equal(compareMetric(m).gap,1);assert.equal(m.targets[0].value.mode,'reported_rate');});
test('monthly EUR money comparisons preserve period and currency',()=>{const c=compareMetric(sample('money','2000','100',{currency:'EUR',period:'month'}));assert.equal(c.gap,1900);assert.equal(c.target.value.period,'month');});
test('comparator at_most checks opposite direction',()=>{const m=sample('number','2','3',{comparator:'at_most'});assert.equal(compareMetric(m).status,'unmet');assert.match(describeGap(m,compareMetric(m)),/Πάνω/);});
test('percentage bounds and invalid numbers are rejected',()=>{assert.throws(()=>parseValue('percentage','101'));assert.throws(()=>parseValue('number','Infinity'));assert.throws(()=>parseValue('money','3',{currency:'BAD$'}));});
test('backdated observation does not replace newer current',()=>{let m=sample('number','4','1');const first=getCurrent(m);m=addObservation(m,'2',new Date(Date.now()-86400000).toISOString());assert.equal(getCurrent(m).id,first.id);assert.equal(m.observations.length,2);});
test('target edit retains historical target revisions',()=>{let m=sample('number','4','1');m=changeTarget(m,'3');assert.equal(m.targets.length,2);assert.equal(getTarget(m).value.amount,3);assert.equal(m.targets[0].value.amount,4);});
test('same target does not create redundant revision',()=>{let m=sample('number','4');m=changeTarget(m,'4');assert.equal(m.targets.length,1);});
test('gold metrics sort first inside folder',()=>{const s=demoWorkspace();const a=metricsInArea(s,s.areas[0].id);assert.equal(a[0].gold,true);});
test('incompatible units cannot be compared',()=>{const m=sample('money','2000','100',{period:'month'});m.observations[0].value.period='year';assert.equal(compareMetric(m).status,'incompatible');});
test('zero goal is safe',()=>{const m=sample('number','0','0',{comparator:'exact'});assert.equal(compareMetric(m).status,'met');});

test('compact progress for count is 25%',()=>assert.equal(metricProgress(sample('number','4','1')).percentage,25));
test('compact progress caps filled track at 100%, not underlying achievement',()=>{const p=metricProgress(sample('number','4','5'));assert.equal(p.filled,100);assert.equal(p.percentage,125);});
test('compact progress is not fabricated for missing actuals',()=>assert.equal(metricProgress(sample('number','4')),null));
test('compact progress is not fabricated for boolean',()=>assert.equal(metricProgress(sample('boolean','yes','no')),null));
test('compact progress is not fabricated for zero target',()=>assert.equal(metricProgress(sample('number','0','0')),null));
test('compact progress is not fabricated for at_most metrics',()=>assert.equal(metricProgress(sample('number','2','3',{comparator:'at_most'})),null));
test('compact progress is not fabricated for negative current',()=>assert.equal(metricProgress(sample('number','4','-2')),null));

test('manual folder order preserves history and survives normalization',()=>{
 const s=demoWorkspace();normalizeMetricOrders(s);const arr=metricsInArea(s,s.areas[0].id);const first=arr[0], second=arr[1];
 const history=first.observations.length;assert.equal(moveMetric(s,second.id,-1,'area'),true);
 assert.equal(metricsInArea(s,s.areas[0].id)[0].id,second.id);
 normalizeMetricOrders(s);assert.equal(metricsInArea(s,s.areas[0].id)[0].id,second.id);
 assert.equal(first.observations.length,history);
});
test('gold goal order independent of folder order',()=>{
 const s=demoWorkspace();normalizeMetricOrders(s);
 const gold=orderedGoldMetrics(s);assert.equal(gold.length,2);
 assert.equal(moveMetric(s,gold[1].id,-1,'gold'),true);
 assert.equal(orderedGoldMetrics(s)[0].id,gold[1].id);
 assert.equal(metricsInArea(s,gold[1].areaId)[0].id,gold[1].id);
 assert.equal(moveMetric(s,gold[1].id,-1,'gold'),false);
});
test('legacy workspace gets deterministic manual orders',()=>{
 const s=demoWorkspace();assert.ok(s.metrics.every(m=>m.order===undefined));
 normalizeMetricOrders(s);assert.ok(s.metrics.every(m=>Number.isInteger(m.order)));
 assert.equal(orderedGoldMetrics(s).length,2);
});
