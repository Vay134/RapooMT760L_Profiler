import { VENDOR, PRODUCT, PRESET, ACTIONS, BUTTONS, KEYS, requireRapoo, validateProfile, compileProfile, makeReport, validateMacro } from './protocol.mjs?v=20260928-2';

const $ = selector => document.querySelector(selector);
const connect = $('#connect');
const apply = $('#apply');
const status = $('#status');
const progress = $('#progress');
let receiver;
let busy = false;
let lines = [];
let macros = [];
let recording = false;
let recordedAt = 0;
const recordedKeys = new Set();
const record = text => {
    lines.push(text);
    lines = lines.slice(-40);
    $('#log').textContent = lines.join('\n');
};

BUTTONS.forEach((text, i) => {
    const label = document.createElement('label');
    label.textContent = text;
    const select = document.createElement('select');
    select.id = `button-${i}`;
    const groups = {};
    Object.entries(ACTIONS).forEach(([key, action]) => {
        if (['media:181', 'media:205', 'shortcut:8:15', 'shortcut:1:6'].includes(key)) return;
        const group = action.group || 'Mouse / saved actions';
        if (!groups[group]) {
            groups[group] = document.createElement('optgroup');
            groups[group].label = group;
            select.append(groups[group]);
        }
        groups[group].append(new Option(action.label, key));
    });
    select.add(new Option('Custom shortcut…', 'custom'));
    const shortcut = document.createElement('div');
    shortcut.className = 'grid';
    shortcut.hidden = true;
    const modifier = document.createElement('select');
    modifier.id = `modifier-${i}`;
    modifier.setAttribute('aria-label', `${text} shortcut modifier`);
    ['Ctrl', 'Shift', 'Alt', 'Win', 'Right Ctrl', 'Right Shift', 'Right Alt', 'Right Win'].forEach((name, bit) => modifier.add(new Option(name, 1 << bit)));
    const key = document.createElement('select');
    key.id = `key-${i}`;
    key.setAttribute('aria-label', `${text} shortcut key`);
    KEYS.filter(([code]) => code < 224).forEach(([code, name]) => key.add(new Option(name, code)));
    shortcut.append(modifier, key);
    select.onchange = () => { shortcut.hidden = select.value !== 'custom'; };
    label.append(select, shortcut);
    $('#buttons').append(label);
});

function showProfile(value) {
    const profile = validateProfile(value);
    stopRecording();
    macros = profile.macros.map(m => structuredClone(m));
    refreshMacroChoices();
    $('#macro-slot').value = macros[0]?.slot ?? 0;
    showMacro();
    $('#name').value = profile.name;
    $('#dpi').value = profile.dpiLevels.join(', ');
    $('#active-dpi').value = profile.activeDpi + 1;
    $('#rate').value = profile.pollingRate;
    profile.buttons.forEach((action, i) => {
        const select = $(`#button-${i}`);
        select.value = Object.hasOwn(ACTIONS, action) || action.startsWith('macro:') ? action : 'custom';
        if (select.value === 'custom') {
            const [, modifier, key] = action.split(':');
            $(`#modifier-${i}`).value = modifier;
            $(`#key-${i}`).value = key;
        }
        select.onchange();
    });
}

function editorProfile() {
    const dpiLevels = $('#dpi').value.split(',').map(d => Number(d.trim()));
    const activeDpi = Number($('#active-dpi').value) - 1;
    return validateProfile({
        format: PRESET.format, version: 2, name: $('#name').value,
        dpi: dpiLevels[activeDpi], dpiLevels, activeDpi, pollingRate: Number($('#rate').value),
        macros,
        buttons: BUTTONS.map((_, i) => {
            const action = $(`#button-${i}`).value;
            return action === 'custom' ? `shortcut:${$(`#modifier-${i}`).value}:${$(`#key-${i}`).value}` : action;
        }),
    });
}

function setBusy(value) {
    busy = value;
    connect.disabled = value || !navigator.hid;
    apply.disabled = value || !receiver?.opened;
    $('#fields').disabled = value;
    ['#preset', '#name', '#download', '#import', '#file'].forEach(id => { $(id).disabled = value; });
}

const macroKeys = [...KEYS, [240, 'Mouse left'], [241, 'Mouse right'], [242, 'Mouse middle'], [243, 'Mouse back'], [244, 'Mouse forward']];
for (let slot = 0; slot < 16; slot++) $('#macro-slot').add(new Option(`Slot ${slot + 1}`, slot));
function currentMacro() { return macros.find(m => m.slot === Number($('#macro-slot').value)); }
function refreshMacroChoices() {
    BUTTONS.forEach((_, i) => {
        const select = $(`#button-${i}`), value = select.value;
        select.querySelectorAll('option[data-macro]').forEach(o => o.remove());
        macros.forEach(m => {
            const option = new Option(`Macro: ${m.name}`, `macro:${m.slot}`);
            option.dataset.macro = 'true';
            select.add(option);
        });
        select.value = [...select.options].some(o => o.value === value) ? value : 'disabled';
    });
}
function stopRecording() {
    if (recording) {
        const m = currentMacro();
        if (m) for (const key of recordedKeys) m.events.push({type: 'up', key, delay: 0});
    }
    recordedKeys.clear();
    recording = false;
    $('#record-macro').textContent = 'Record keys';
    $('#record-area').hidden = true;
}
function showMacro() {
    stopRecording();
    const m = currentMacro();
    $('#macro-edit').hidden = !m;
    if (!m) return;
    $('#macro-name').value = m.name;
    $('#macro-mode').value = m.mode;
    $('#macro-repeat').value = m.repeat;
    $('#macro-ignore').checked = m.ignoreDelays;
    $('#macro-repeat').disabled = m.mode !== 'repeat';
    renderEvents();
}
function renderEvents() {
    const m = currentMacro(), list = $('#macro-events');
    list.replaceChildren();
    m.events.forEach((e, i) => {
        const row = document.createElement('div'); row.className = 'macro-row';
        const field = (name, element, update) => {
            const label = document.createElement('label'); label.textContent = name;
            element.onchange = () => update(element.value);
            label.append(element); row.append(label); return element;
        };
        const number = (name, value, min, max, update) => {
            const input = document.createElement('input'); input.type = 'number'; input.min = min; input.max = max; input.step = 1; input.value = value;
            field(name, input, v => update(Number(v)));
        };
        const type = document.createElement('select');
        [['down', 'Press'], ['up', 'Release'], ['move', 'Move pointer'], ['wheel', 'Scroll'], ['tilt', 'Horizontal scroll']].forEach(([v, text]) => type.add(new Option(text, v)));
        type.value = e.type;
        field('Event', type, v => { m.events[i] = {type: v, delay: e.delay, ...(['down', 'up'].includes(v) ? {key: 4} : v === 'move' ? {x: 1, y: 0} : {amount: 1})}; renderEvents(); });
        if (['down', 'up'].includes(e.type)) {
            const key = document.createElement('select'); macroKeys.forEach(([code, text]) => key.add(new Option(text, code))); key.value = e.key;
            field('Key / button', key, v => { e.key = Number(v); });
        } else if (e.type === 'move') {
            number('X', e.x, -2048, 2047, v => { e.x = v; }); number('Y', e.y, -2048, 2047, v => { e.y = v; });
        } else number('Amount', e.amount, -127, 127, v => { e.amount = v; });
        number('Delay after (ms)', e.delay, 0, 30000, v => { e.delay = v; });
        const actions = document.createElement('div'); actions.className = 'actions';
        [['Up', -1], ['Down', 1], ['Remove', 0]].forEach(([text, direction]) => {
            const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
            button.setAttribute('aria-label', `${text} event ${i + 1}`);
            button.disabled = direction !== 0 && (i + direction < 0 || i + direction >= m.events.length);
            button.onclick = () => { if (!direction) m.events.splice(i, 1); else [m.events[i], m.events[i + direction]] = [m.events[i + direction], m.events[i]]; renderEvents(); };
            actions.append(button);
        });
        row.append(actions); list.append(row);
    });
}
$('#macro-slot').onchange = showMacro;
$('#add-macro').onclick = () => {
    const slot = Number($('#macro-slot').value);
    if (currentMacro()) { status.textContent = 'This macro slot is already in use.'; return; }
    macros.push({slot, name: `Macro ${slot + 1}`, mode: 'repeat', repeat: 1, ignoreDelays: false, events: [{type: 'down', key: 4, delay: 100}, {type: 'up', key: 4, delay: 0}]});
    refreshMacroChoices(); showMacro();
};
$('#remove-macro').onclick = () => { const m = currentMacro(); macros = macros.filter(v => v !== m); refreshMacroChoices(); showMacro(); };
$('#macro-name').oninput = () => { currentMacro().name = $('#macro-name').value; refreshMacroChoices(); };
$('#macro-mode').onchange = () => { currentMacro().mode = $('#macro-mode').value; $('#macro-repeat').disabled = currentMacro().mode !== 'repeat'; };
$('#macro-repeat').onchange = () => { currentMacro().repeat = Number($('#macro-repeat').value); };
$('#macro-ignore').onchange = () => { currentMacro().ignoreDelays = $('#macro-ignore').checked; };
$('#add-event').onclick = () => { currentMacro().events.push({type: 'down', key: 4, delay: 0}); renderEvents(); };
$('#record-macro').onpointerdown = event => { if (recording) event.preventDefault(); };
$('#record-macro').onclick = () => {
    if (recording) { stopRecording(); renderEvents(); return; }
    currentMacro().events = []; recordedKeys.clear(); recording = true; recordedAt = 0;
    $('#record-macro').textContent = 'Stop recording'; $('#record-area').hidden = false; $('#record-area').focus();
    renderEvents();
};
const browserKeys = {ControlLeft: 224, ShiftLeft: 225, AltLeft: 226, MetaLeft: 227, ControlRight: 228, ShiftRight: 229, AltRight: 230, MetaRight: 231, Enter: 40, Escape: 41, Backspace: 42, Tab: 43, Space: 44, Minus: 45, Equal: 46, BracketLeft: 47, BracketRight: 48, Backslash: 49, Semicolon: 51, Quote: 52, Backquote: 53, Comma: 54, Period: 55, Slash: 56, CapsLock: 57, PrintScreen: 70, ScrollLock: 71, Pause: 72, Insert: 73, Home: 74, PageUp: 75, Delete: 76, End: 77, PageDown: 78, ArrowRight: 79, ArrowLeft: 80, ArrowDown: 81, ArrowUp: 82, NumLock: 83};
for (let i = 0; i < 26; i++) browserKeys[`Key${String.fromCharCode(65 + i)}`] = 4 + i;
for (let i = 1; i <= 9; i++) browserKeys[`Digit${i}`] = 29 + i;
browserKeys.Digit0 = 39;
for (let i = 1; i <= 12; i++) browserKeys[`F${i}`] = 57 + i;
function recordKey(event) {
    if (!recording) return;
    event.preventDefault(); event.stopPropagation();
    if (event.repeat) return;
    const key = browserKeys[event.code];
    if (key === undefined) { status.textContent = 'This key cannot be recorded here. Add it with the event editor.'; return; }
    if (event.type === 'keyup' && !recordedKeys.has(key)) return;
    if (event.type === 'keydown') recordedKeys.add(key); else recordedKeys.delete(key);
    const m = currentMacro(), now = performance.now();
    if (m.events.length >= 1000) { stopRecording(); renderEvents(); return; }
    if (m.events.length) m.events.at(-1).delay = Math.min(30000, Math.round(now - recordedAt));
    m.events.push({type: event.type === 'keydown' ? 'down' : 'up', key, delay: 0}); recordedAt = now;
    $('#record-count').textContent = `${m.events.length} events recorded`;
}
$('#record-area').onkeydown = recordKey;
$('#record-area').onkeyup = recordKey;


showProfile(PRESET);
$('#preset').onclick = () => { showProfile(PRESET); status.textContent = 'Default profile loaded into the editor.'; };
$('#import').onclick = () => $('#file').click();
$('#file').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
        if (file.size > 1048576) throw new Error('Profile files must be smaller than 1 MB.');
        const value = JSON.parse(await file.text());
        if (busy) throw new Error('Wait for the current transfer to finish.');
        showProfile(value);
        status.textContent = 'Profile imported. Apply to send it to the mouse.';
    } catch (error) { status.textContent = `Import failed: ${error.message}`; }
    finally { event.target.value = ''; }
};
$('#download').onclick = () => {
    try {
        stopRecording();
        const profile = editorProfile();
        const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 4) + '\n'], {type: 'application/json'}));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${profile.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'profile'}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        status.textContent = 'Profile exported.';
    } catch (error) { status.textContent = error.message; }
};

async function queryStatus() {
    // A HUB status query; a supported receiver returns current DPI in report BB.
    const query = new Uint8Array(31);
    query[0] = 0xb0;
    try { requireRapoo(receiver); await receiver.sendReport(0xba, query); }
    catch (error) { record(`Status query: ${error.message}`); }
}

if (!navigator.hid) {
    connect.disabled = true;
    status.textContent = 'Use desktop Chrome or Edge with device access enabled.';
}
connect.onclick = async () => {
    if (busy) return;
    setBusy(true);
    try {
        if (receiver?.opened) await receiver.close();
        receiver = undefined;
        let selected = (await navigator.hid.getDevices()).filter(d => d.vendorId === VENDOR && d.productId === PRODUCT && d.collections.some(c => c.usagePage === 0xff00 && c.usage === 14));
        if (selected.length !== 1) selected = await navigator.hid.requestDevice({filters: [{vendorId: VENDOR, productId: PRODUCT, usagePage: 0xff00, usage: 14}]});
        if (selected.length !== 1) throw new Error('Choose the Rapoo receiver in the connection window.');
        receiver = requireRapoo(selected[0]);
        await receiver.open();
        receiver.oninputreport = event => {
            const data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
            if (event.reportId === 0xbb && data.length >= 6 && data[0] === 0xb0) {
                const dpi = data[2] | data[3] << 8;
                if (dpi >= 50 && dpi <= 4000) $('#live').textContent = `Last reported mouse DPI: ${dpi}. Editor values remain from the selected profile; button and polling-rate readback is unavailable.`;
            }
        };
        $('#device').textContent = 'Rapoo · 2.4 GHz · Connected';
        $('#live').textContent = 'Displayed settings are from the selected profile. Full device readback is unavailable in this browser.';
        record('Connected to Rapoo 24AE:1870.');
        status.textContent = 'Connected. Apply sends the displayed settings to the mouse.';
        await queryStatus();
    } catch (error) {
        $('#device').textContent = 'Rapoo · 2.4 GHz · Disconnected';
        status.textContent = error.message;
        record(`Connection failed: ${error.message}`);
    } finally { setBusy(false); }
};
$('#editor').onsubmit = async event => {
    event.preventDefault();
    if (busy) return;
    let profile, blocks;
    stopRecording();
    try { profile = editorProfile(); blocks = compileProfile(profile); }
    catch (error) { status.textContent = error.message; return; }
    stopRecording();
    setBusy(true);
    progress.hidden = false;
    progress.value = 0;
    progress.max = blocks.length;
    try {
        for (let i = 0; i < blocks.length; i++) {
            requireRapoo(receiver);
            if (!receiver.opened) throw new Error('Receiver disconnected. Reconnect and apply again.');
            status.textContent = `Sending profile (${i + 1} of ${blocks.length})…`;
            await receiver.sendReport(0xba, makeReport(i, blocks));
            progress.value = i + 1;
            await new Promise(resolve => setTimeout(resolve, 275));
        }
        status.textContent = 'Profile sent. Test the mouse to confirm the settings.';
        record(`Sent profile: ${profile.name}, ${profile.dpi} DPI, ${1000 / profile.pollingRate} Hz.`);
        $('#live').textContent = 'Profile sent. Waiting for mouse DPI status; full settings readback is unavailable.';
        await queryStatus();
    } catch (error) { status.textContent = `Apply stopped: ${error.message}`; record(status.textContent); }
    finally { setBusy(false); }
};
navigator.hid?.addEventListener('disconnect', event => {
    if (event.device !== receiver) return;
    apply.disabled = true;
    $('#device').textContent = 'Rapoo · 2.4 GHz · Disconnected';
    $('#live').textContent = 'Displayed settings are from the selected profile.';
    status.textContent = 'Receiver disconnected. Reconnect to apply a profile.';
});
