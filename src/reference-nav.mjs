// Sidebar structure for the docs generated from the CukeDedup source repository.
// `scripts/sync-docs.mjs` fails when the upstream docs gain a top-level page or a folder
// that is neither listed here nor excluded in `scripts/lib/sync-docs.mjs`, so a new page
// cannot silently vanish from the navigation.
//
// `children` names a `docs/<folder>/` whose pages are listed under that page in the order the
// page links to them. An entry whose file is absent at the synced tag is left out of the sidebar.
export const docsNav = [
  { file: 'configuration.md', label: 'Configuration', section: 'Reference' },
  {
    file: 'discovery-and-frameworks.md',
    label: 'Discovery and Frameworks',
    section: 'Reference',
    children: 'discovery',
  },
  { file: 'rules.md', label: 'Rules', section: 'Reference', children: 'rules' },
  { file: 'reports.md', label: 'Reports', section: 'Reference' },
  { file: 'ci-and-baselines.md', label: 'CI and Baselines', section: 'Guides' },
  { file: 'safety-and-limitations.md', label: 'Safety and Limitations', section: 'Guides' },
];

// Sidebar section order.
export const docsSections = ['Reference', 'Guides'];
