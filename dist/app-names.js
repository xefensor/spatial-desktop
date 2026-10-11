/* Visible names describe the job first. IDs and launch commands stay stable. */
(function(root) {
  const names = Object.freeze({
  "Dolphin": "File Browser Dolphin",
  "Elisa": "Music Player Elisa",
  "Firefox": "Web Browser Firefox",
  "Web": "Web Browser Firefox",
  "Konsole": "Terminal Konsole",
  "Notes": "Note Editor Notes",
  "Spatial Guide": "Desktop Guide Spatial Guide",
  "Krita": "Painting App Krita",
  "Gwenview": "Image Viewer Gwenview",
  "Inkscape": "Vector Editor Inkscape",
  "Blender": "3D Editor Blender",
  "Spectacle": "Screenshot Tool Spectacle",
  "Steam": "Game Launcher Steam",
  "Lutris": "Game Launcher Lutris",
  "Thunderbird": "Email Client Thunderbird",
  "KDE Connect": "Device Link KDE Connect",
  "LibreOffice Writer": "Word Processor LibreOffice Writer",
  "Writer": "Word Processor LibreOffice Writer",
  "LibreOffice Calc": "Spreadsheet LibreOffice Calc",
  "Calc": "Spreadsheet LibreOffice Calc",
  "Kalendar": "Calendar Kalendar",
  "VLC": "Media Player VLC",
  "Kdenlive": "Video Editor Kdenlive",
  "OBS Studio": "Screen Recorder OBS Studio",
  "Calculator": "Calculator",
  "Ark": "Archive Manager Ark",
  "Settings": "System Settings",
  "System Monitor": "System Monitor",
  "Discover": "Software Center Discover",
  "Partitions": "Partition Manager",
  "KStars": "Planetarium KStars",
  "Marble": "World Map Marble",
  "Kate": "Text Editor Kate",
  "KDevelop": "IDE KDevelop",
  "Qt Creator": "IDE Qt Creator",
  "Help Center": "Help Center",
  "Legacy Tools": "Other Apps Legacy Tools",
  "Okular": "Document Viewer Okular",
  "Discord": "Chat Discord",
  "MangoHud": "Performance Overlay MangoHud",
  "Mail": "Email Client Mail"
});
  function label(value) {
    const text = String(value || '');
    if (names[text]) return names[text];
    const separator = text.indexOf(' · ');
    if (separator !== -1 && names[text.slice(0,separator)]) return names[text.slice(0,separator)] + text.slice(separator);
    return text;
  }
  const api = Object.freeze({names, label});
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SpatialAppNames = api;
})(globalThis);
