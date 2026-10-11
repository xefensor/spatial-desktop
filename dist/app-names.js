/* Visible names describe generic functions. Legacy launch keys remain stable. */
(function(root) {
  const names = Object.freeze({
  "Dolphin": "File Browser",
  "Elisa": "Music Player",
  "Firefox": "Web Browser",
  "Web": "Web Browser",
  "Konsole": "Terminal",
  "Notes": "Note Editor",
  "Spatial Guide": "Desktop Guide",
  "Krita": "Painting App",
  "Gwenview": "Image Viewer",
  "Inkscape": "Vector Editor",
  "Blender": "3D Editor",
  "Spectacle": "Screenshot Tool",
  "Steam": "Game Launcher",
  "Lutris": "Game Launcher",
  "Thunderbird": "Email Client",
  "KDE Connect": "Device Link",
  "LibreOffice Writer": "Word Processor",
  "Writer": "Word Processor",
  "LibreOffice Calc": "Spreadsheet",
  "Calc": "Spreadsheet",
  "Kalendar": "Calendar",
  "VLC": "Media Player",
  "Kdenlive": "Video Editor",
  "OBS Studio": "Screen Recorder",
  "Calculator": "Calculator",
  "Ark": "Archive Manager",
  "Settings": "System Settings",
  "System Monitor": "System Monitor",
  "Discover": "Software Center",
  "Partitions": "Partition Manager",
  "KStars": "Planetarium",
  "Marble": "World Map",
  "Kate": "Text Editor",
  "KDevelop": "IDE",
  "Qt Creator": "IDE",
  "Help Center": "Help Center",
  "Legacy Tools": "Other Apps",
  "Okular": "Document Viewer",
  "Discord": "Chat",
  "MangoHud": "Performance Overlay",
  "Mail": "Email Client"
});
  const previousLabels = Object.freeze({
  "File Browser Dolphin": "File Browser",
  "Music Player Elisa": "Music Player",
  "Web Browser Firefox": "Web Browser",
  "Terminal Konsole": "Terminal",
  "Note Editor Notes": "Note Editor",
  "Desktop Guide Spatial Guide": "Desktop Guide",
  "Painting App Krita": "Painting App",
  "Image Viewer Gwenview": "Image Viewer",
  "Vector Editor Inkscape": "Vector Editor",
  "3D Editor Blender": "3D Editor",
  "Screenshot Tool Spectacle": "Screenshot Tool",
  "Game Launcher Steam": "Game Launcher",
  "Game Launcher Lutris": "Game Launcher",
  "Email Client Thunderbird": "Email Client",
  "Device Link KDE Connect": "Device Link",
  "Word Processor LibreOffice Writer": "Word Processor",
  "Spreadsheet LibreOffice Calc": "Spreadsheet",
  "Calendar Kalendar": "Calendar",
  "Media Player VLC": "Media Player",
  "Video Editor Kdenlive": "Video Editor",
  "Screen Recorder OBS Studio": "Screen Recorder",
  "Archive Manager Ark": "Archive Manager",
  "Software Center Discover": "Software Center",
  "Planetarium KStars": "Planetarium",
  "World Map Marble": "World Map",
  "Text Editor Kate": "Text Editor",
  "IDE KDevelop": "IDE",
  "IDE Qt Creator": "IDE",
  "Other Apps Legacy Tools": "Other Apps",
  "Document Viewer Okular": "Document Viewer",
  "Chat Discord": "Chat",
  "Performance Overlay MangoHud": "Performance Overlay",
  "Email Client Mail": "Email Client"
});
  function label(value) {
    const text = String(value || '');
    if (names[text] || previousLabels[text]) return names[text] || previousLabels[text];
    const separator = text.indexOf(' · ');
    if (separator !== -1) {
      const base = text.slice(0,separator), mapped = names[base] || previousLabels[base];
      if (mapped) return mapped + text.slice(separator);
    }
    return text;
  }
  const api = Object.freeze({names, label});
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SpatialAppNames = api;
})(globalThis);
