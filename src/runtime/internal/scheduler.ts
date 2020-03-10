import { run_all } from './utils';
import { set_current_component } from './lifecycle';

export const dirty_components = [];
export const dirty_components_data = { length : 0 };
export const intros = { enabled: false };

export const binding_callbacks = [];
const render_callbacks = [];
let render_callbacks_length = 0;
const flush_callbacks = [];
let flush_callbacks_length = 0;


const resolved_promise = Promise.resolve();
let update_scheduled = false;

export function schedule_update() {
	if (!update_scheduled) {
		update_scheduled = true;
		resolved_promise.then(flush);
	}
}

export function tick() {
	schedule_update();
	return resolved_promise;
}

export function add_render_callback(fn) {
	render_callbacks[render_callbacks_length] = fn;
	render_callbacks_length += 1;
}

export function add_flush_callback(fn) {
	flush_callbacks[flush_callbacks_length] = fn;
	flush_callbacks_length += 1;
}

let flushing = false;
const seen_callbacks = [];
let seen_callbacks_length = 0;
export function flush() {
	if (flushing) return;
	flushing = true;

	do {
		// first, call beforeUpdate functions
		// and update components
		for (let i = 0; i < dirty_components_data.length; i += 1) {
			const component = dirty_components[i];
			set_current_component(component);
			update(component.$$);
		}

		dirty_components_data.length = 0;

		while (binding_callbacks.length) binding_callbacks.pop()();

		// then, once components are updated, call
		// afterUpdate functions. This may cause
		// subsequent updates...
		for (let i = 0; i < render_callbacks_length; i += 1) {
			const callback = render_callbacks[i];
			const seen_index = seen_callbacks.indexOf(callback);

			if (seen_index === -1 || seen_index >= seen_callbacks_length) {
				// ...so guard against infinite loops
				seen_callbacks[seen_callbacks_length] = callback;
				seen_callbacks_length += 1;

				callback();
			}
		}

		render_callbacks_length = 0;
	} while (dirty_components_data.length);

	while (flush_callbacks_length) {
		flush_callbacks[flush_callbacks_length - 1]();
		flush_callbacks_length -= 1;
	}

	update_scheduled = false;
	flushing = false;
	seen_callbacks_length = 0;
}

function update($$) {
	if ($$.fragment !== null) {
		$$.update();
		run_all($$.before_update);
		const dirty = $$.dirty;
		$$.dirty = [-1];
		$$.fragment && $$.fragment.p($$.ctx, dirty);
		$$.after_update.forEach(add_render_callback);
	}
}
