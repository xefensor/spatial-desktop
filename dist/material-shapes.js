/* Use the same superellipse silhouette when native corner-shape is absent.
   The portable query is also useful for checking that path in any browser. */
(() => {
  const portable = new URL(location.href).searchParams.get('shape') === 'portable';
  document.documentElement.classList.toggle('material-shape-portable', portable || !CSS.supports('corner-shape', 'squircle'));
})();
