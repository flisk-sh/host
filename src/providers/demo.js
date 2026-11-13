// A pretend host, so the whole cabinet flow can be tried with no account. It starts nothing: the address does not exist.
export default {
  label: 'Demo (pretend)',
  demo: true,
  async create(_key, { name }) {
    return { id: `demo${name.slice(-6)}`, url: `https://${name}.demo.invalid` };
  },
  async remove() {},
};
