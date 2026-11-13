// A hosting provider is: label, create(key, {name, token}) -> {id, url}, remove(key, id). Add one by adding a file here.
import demo from './demo.js';
import render from './render.js';
import fly from './fly.js';
import koyeb from './koyeb.js';
import northflank from './northflank.js';

export const PROVIDERS = { render, fly, koyeb, northflank, demo };
export const hostRef = (provider, id) => `host_${provider}_${id}`;
export const parseRef = (ref) => {
  const m = /^host_([a-z0-9]+)_(.+)$/.exec(ref || '');
  return m ? { provider: m[1], id: m[2] } : null;
};
