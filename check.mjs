import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { requireRapoo, makeReport, PROFILE, PRESET, validateProfile, compileProfile } from './protocol.mjs';

const rapoo = {
    vendorId: 0x24ae, productId: 0x1870,
    collections: [{usagePage: 0xff00, usage: 14, outputReports: [{reportId: 0xba, items: [{reportSize: 8, reportCount: 31}]}]}],
};
assert.equal(requireRapoo(rapoo), rapoo);
assert.throws(() => requireRapoo({...rapoo, vendorId: 0x1532, productId: 0x00c4}));
assert.throws(() => requireRapoo({...rapoo, collections: []}));
assert.throws(() => makeReport(13));
assert.equal(PROFILE.length, 13);
assert.deepEqual(Array.from(makeReport(5).slice(0, 11)), [0xa5, 0xa5, 4, 0x14, 6, 0, 0, 4, 0, 0, 205]);
assert.ok(PROFILE.every((_, i) => makeReport(i).length === 31));
// SHA-256 of the 13 captured A HUB payloads, in their original order.
assert.equal(createHash('sha256').update(Buffer.concat(PROFILE.map((_, i) => Buffer.from(makeReport(i))))).digest('hex'), '6449ace20cc8287cfd12404f6e6c71c46539d5fe04d1f16ca567d4a7ad3b5e38');
console.log('Rapoo targeting and captured report encoding passed.');

assert.deepEqual(compileProfile(PRESET), PROFILE);
const roundTrip = validateProfile(JSON.parse(JSON.stringify(PRESET)));
assert.deepEqual(roundTrip, PRESET);
const edited = {...roundTrip, name: 'Test', dpi: 2000, dpiLevels: [2000], pollingRate: 2, buttons: [...roundTrip.buttons]};
edited.buttons[5] = 'next';
const blocks = compileProfile(edited);
assert.deepEqual(blocks[0][1], [40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3]);
assert.deepEqual(blocks[1][1], [2, 2, 255, 255]);
assert.deepEqual(blocks[5][1], [4, 0, 0, 181]);
for (const rate of [1, 2, 4, 8]) assert.deepEqual(compileProfile({...roundTrip, pollingRate: rate})[1][1], [rate, rate, 255, 255]);
assert.throws(() => validateProfile({...roundTrip, dpi: 50000}));
assert.throws(() => validateProfile({...roundTrip, pollingRate: 3}));
assert.throws(() => validateProfile({...roundTrip, buttons: Array(7).fill('next')}));
assert.throws(() => validateProfile({...roundTrip, buttons: ['__proto__', ...roundTrip.buttons.slice(1)]}));
assert.throws(() => validateProfile({...roundTrip, version: 3}));
assert.throws(() => makeReport(0, [[0x999, blocks[0][1]]]));
const old = {format: PRESET.format, version: 1, name: 'Old', dpi: 1000, pollingRate: 1, buttons: ['left', 'right', 'middle', 'lock', 'copy', 'playPause', 'next'], verticalReversed: false, horizontalReversed: false};
assert.deepEqual(compileProfile(old), PROFILE);
assert.deepEqual(compileProfile({...PRESET, buttons: PRESET.buttons.map((a,i) => i === 3 ? 'key:4' : a)})[7][1], [1,0,4,0]);
assert.deepEqual(compileProfile({...PRESET, buttons: PRESET.buttons.map((a,i) => i === 3 ? 'shortcut:2:4' : a)})[7][1], [2,0,2,4]);
assert.throws(() => validateProfile({...PRESET, buttons: PRESET.buttons.map((a,i) => i === 3 ? 'shortcut:255:4' : a)}));
console.log('Profile import, encoding, preset preservation and validation passed.');

const multi = compileProfile({...PRESET, dpi: 2000, dpiLevels: [800, 2000, 4000], activeDpi: 1});
assert.deepEqual(multi[0][1], [16,0,40,0,80,0,0,0,0,0,0,0,0,0,2,0,1,0,2,3]);
assert.throws(() => validateProfile({...PRESET, dpiLevels: Array(8).fill(1000)}));
