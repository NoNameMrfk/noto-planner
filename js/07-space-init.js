/* Deep space background and app init */
    let spaceAnimId = null;
    let spaceStars = null;
    let spacePointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    let spaceReduced = false;

    function spaceThemeTint(theme) {
      const tints = {
        midnight:  { r: 18, g: 28, b: 48, neb: [36, 64, 110], star: [210, 220, 240], mono: false },
        forest:    { r: 12, g: 28, b: 18, neb: [28, 68, 42], star: [210, 230, 215], mono: false },
        black:     { r: 8,  g: 8,  b: 8,  neb: [40, 40, 40], star: [220, 220, 220], mono: true },
        vermilion: { r: 28, g: 12, b: 10, neb: [90, 32, 24], star: [245, 210, 195], mono: false }
      };
      return tints[theme] || tints.black;
    }

    function spaceThemes() {
      return ["midnight", "forest", "black", "vermilion"];
    }

    // Full content continues in repo - this is a partial to test; will overwrite with complete file
