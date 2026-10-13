/* Identificação central do produto. Atualize version em cada lançamento. */
const CGU = Object.freeze({
  version: '1.0.1',
  icon(name) {
    const paths = {
      camera: '<path d="M4 6h4l2-3h4l2 3h4v14H4z"/><circle cx="12" cy="12" r="4"/>',
      image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 18 6-6 4 4 3-3 5 5"/>',
      pen: '<path d="m4 16 12-12 4 4L8 20H4zM14 6l4 4"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`;
  }
});
