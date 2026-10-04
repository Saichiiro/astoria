# Index Page Improvement Ideas

An opinionated list of potential enhancements focused on `index.html` and its UI/UX patterns.

- **Table usability and truncation**: Keep the existing ellipsis treatment on long names so rows never stretch, and favor minimal sort styling over additional tooltips for now.
- **Responsive layout**: Introduce breakpoints so the table becomes a stacked card layout on small screens, keeping search and filter controls accessible via a sticky header region.
- **Search and filter UX**: Preserve recent searches across sessions (e.g., `localStorage`) and add a "clear filters" chip to reset category and text queries in one click.
- **Accessibility**: Provide ARIA sort states on sortable headers, label the modal close button for screen readers, and ensure keyboard focus is trapped inside the modal when open.
- **Performance**: Debounce the search input to reduce unnecessary rerenders, and consider pagination or virtual scrolling if the dataset grows.
- **Content affordances**: Show item counts per category in the dropdown, and add inline badges (e.g., "Exclu saison") next to item names for quick scanning without opening the modal.
- **Media handling**: Lazy-load carousel images and display loading fallbacks for slower connections, while keeping the placeholder SVG for missing assets.
