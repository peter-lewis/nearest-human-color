(function(context) {

  /**
   * Defines an available color.
   *
   * @typedef {Object} ColorSpec
   * @property {string=} name A name for the color, e.g., 'red'
   * @property {string} source The hex-based color string, e.g., '#FF0'
   * @property {RGB} rgb The {@link RGB} color values
   */

  /**
   * Describes a matched color.
   *
   * @typedef {Object} ColorMatch
   * @property {string} name The name of the matched color, e.g., 'red'
   * @property {string} value The hex-based color string, e.g., '#FF0'
   * @property {RGB} rgb The {@link RGB} color values.
   */

  /**
   * Provides the RGB breakdown of a color.
   *
   * @typedef {Object} RGB
   * @property {number} r The red component, from 0 to 255
   * @property {number} g The green component, from 0 to 255
   * @property {number} b The blue component, from 0 to 255
   */

  /**
   * Gets the nearest color, from the given list of {@link ColorSpec} objects
   * (which defaults to {@link nearestHumanColor.DEFAULT_COLORS}).
   *
   * Probably you wouldn't call this method directly. Instead you'd get a custom
   * color matcher by calling {@link nearestHumanColor.from}.
   *
   * @public
   * @param {RGB|string} needle Either an {@link RGB} color or a hex-based
   *     string representing one, e.g., '#FF0'
   * @param {Array.<ColorSpec>=} colors An optional list of available colors
   *     (defaults to {@link nearestHumanColor.DEFAULT_COLORS})
   * @return {ColorMatch|string} If the colors in the provided list had names,
   *     then a {@link ColorMatch} object with the name and (hex) value of the
   *     nearest color from the list. Otherwise, simply the hex value.
   *
   * @example
   * nearestHumanColor({ r: 200, g: 50, b: 50 }); // => '#f00'
   * nearestHumanColor('#f11');                   // => '#f00'
   * nearestHumanColor('#f88');                   // => '#f80'
   * nearestHumanColor('#ffe');                   // => '#ff0'
   * nearestHumanColor('#efe');                   // => '#ff0'
   * nearestHumanColor('#abc');                   // => '#808'
   * nearestHumanColor('red');                    // => '#f00'
   * nearestHumanColor('foo');                    // => throws
   */
  function nearestHumanColor(needle, colors) {
    needle = createColorSpec(needle); // parseColor(needle);

    if (!needle) {
      return null;
    }

    var distanceSq,
        labDistance,
        minDistanceSq = Infinity,
        rgb,
        value,
        lab;

    colors || (colors = nearestHumanColor.DEFAULT_COLORS);

    for (var i = 0; i < colors.length; ++i) {
      rgb = colors[i].rgb;
      lab = colors[i].lab;


      // distance deltas
      var deltaR = Math.pow(needle.rgb.r - rgb.r, 2);
      var deltaG = Math.pow(needle.rgb.g - rgb.g, 2);
      var deltaB = Math.pow(needle.rgb.b - rgb.b, 2);
      var differencial = (((needle.rgb.r + rgb.r) / 2) * (deltaR - deltaB)) / 256;


      /*
      distanceSq = (
        (3 * deltaR) +
        (7.5 * deltaG) +
        (15 * deltaB) +
        differencial
      );
      */

      /*
      distanceSq = (
        (3 * deltaR) +
        (7.5 * deltaG) +
        (13.5 * deltaB) +
        differencial
      );
      */

      distanceSq = (
        (2 * deltaR) +
        (4 * deltaG) +
        (3 * deltaB) +
        differencial
      );


      distanceSq = Math.sqrt(distanceSq);

      labDistance = ciede2000(needle.lab, lab);

      console.log('distanceSq', distanceSq);
      console.log('labDistance', labDistance);
      distanceSq = (distanceSq + labDistance) / 2;
      console.log('average', labDistance);
      // distanceSq = labDistance;


      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        value = colors[i];
      }
    }

    if (value.name) {
      return {
        name: value.name,
        value: value.source,
        rgb: value.rgb,
        distance: minDistanceSq
      };
    }

    return value.source;
  }

  /**
   * Provides a matcher to find the nearest color based on the provided list of
   * available colors.
   *
   * @public
   * @param {Array.<string>|Object} availableColors An array of hex-based color
   *     strings, or an object mapping color *names* to hex values.
   * @return {function(string):ColorMatch|string} A function with the same
   *     behavior as {@link nearestHumanColor}, but with the list of colors
   *     predefined.
   *
   * @example
   * var colors = {
   *   'maroon': '#800',
   *   'light yellow': { r: 255, g: 255, b: 51 },
   *   'pale blue': '#def',
   *   'white': 'fff'
   * };
   *
   * var bgColors = [
   *   '#eee',
   *   '#444'
   * ];
   *
   * var invalidColors = {
   *   'invalid': 'foo'
   * };
   *
   * var getColor = nearestHumanColor.from(colors);
   * var getBGColor = getColor.from(bgColors);
   * var getAnyColor = nearestHumanColor.from(colors).or(bgColors);
   *
   * getColor('ffe');
   * // => { name: 'white', value: 'fff', rgb: { r: 255, g: 255, b: 255 }, distance: 17}
   *
   * getColor('#f00');
   * // => { name: 'maroon', value: '#800', rgb: { r: 136, g: 0, b: 0 }, distance: 119}
   *
   * getColor('#ff0');
   * // => { name: 'light yellow', value: '#ffff33', rgb: { r: 255, g: 255, b: 51 }, distance: 51}
   *
   * getBGColor('#fff'); // => '#eee'
   * getBGColor('#000'); // => '#444'
   *
   * getAnyColor('#f00');
   * // => { name: 'maroon', value: '#800', rgb: { r: 136, g: 0, b: 0 }, distance: 119}
   *
   * getAnyColor('#888'); // => '#444'
   *
   * nearestHumanColor.from(invalidColors); // => throws
   */
  nearestHumanColor.from = function from(availableColors) {
    var colors = mapColors(availableColors),
        nearestHumanColorBase = nearestHumanColor;

    var matcher = function nearestHumanColor(hex) {
      return nearestHumanColorBase(hex, colors);
    };

    // Keep the 'from' method, to support changing the list of available colors
    // multiple times without needing to keep a reference to the original
    // nearestHumanColor function.
    matcher.from = from;

    // Also provide a way to combine multiple color lists.
    matcher.or = function or(alternateColors) {
      var extendedColors = colors.concat(mapColors(alternateColors));
      return nearestHumanColor.from(extendedColors);
    };

    return matcher;
  };

  /**
   * Given either an array or object of colors, returns an array of
   * {@link ColorSpec} objects (with {@link RGB} values).
   *
   * @private
   * @param {Array.<string>|Object} colors An array of hex-based color strings, or
   *     an object mapping color *names* to hex values.
   * @return {Array.<ColorSpec>} An array of {@link ColorSpec} objects
   *     representing the same colors passed in.
   */
  function mapColors(colors) {
    if (colors instanceof Array) {
      return colors.map(function(color) {
        return createColorSpec(color);
      });
    }

    return Object.keys(colors).map(function(name) {
      return createColorSpec(colors[name], name);
    });
  };

  function hexToLab (hexColor) {
    var rgbColor = parseColor(hexColor);
    return rgbToLab([rgbColor.r, rgbColor.g, rgbColor.b]);
  }

  function rgbToXyz (rgb) {
    var r = rgb[0] / 255;
    var g = rgb[1] / 255;
    var b = rgb[2] / 255;

    // Assume sRGB
    r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
    g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
    b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);

    var x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
    var y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
    var z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

    return [x * 100, y * 100, z * 100];
  };

  function rgbToLab (rgb) {
    var xyz = rgbToXyz (rgb);
    var x = xyz[0];
    var y = xyz[1];
    var z = xyz[2];

    x /= 95.047;
    y /= 100;
    z /= 108.883;

    x = x > 0.008856 ? Math.pow(x, (1 / 3)) : (7.787 * x) + (16 / 116);
    y = y > 0.008856 ? Math.pow(y, (1 / 3)) : (7.787 * y) + (16 / 116);
    z = z > 0.008856 ? Math.pow(z, (1 / 3)) : (7.787 * z) + (16 / 116);

    var l = (116 * y) - 16;
    var a = 500 * (x - y);
    var b = 200 * (y - z);

    return [l, a, b];
  };

  /**
   * Parses a color from a string.
   *
   * @private
   * @param {RGB|string} source
   * @return {RGB}
   *
   * @example
   * parseColor({ r: 3, g: 22, b: 111 }); // => { r: 3, g: 22, b: 111 }
   * parseColor('#f00');                  // => { r: 255, g: 0, b: 0 }
   * parseColor('#04fbc8');               // => { r: 4, g: 251, b: 200 }
   * parseColor('#FF0');                  // => { r: 255, g: 255, b: 0 }
   * parseColor('rgb(3, 10, 100)');       // => { r: 3, g: 10, b: 100 }
   * parseColor('rgb(50%, 0%, 50%)');     // => { r: 128, g: 0, b: 128 }
   * parseColor('aqua');                  // => { r: 0, g: 255, b: 255 }
   * parseColor('fff');                   // => { r: 255, g: 255, b: 255 }
   * parseColor('foo');                   // => throws
   */
  function parseColor(source) {
    var red, green, blue;

    if (typeof source === 'object') {
      return source;
    }

    if (source in nearestHumanColor.STANDARD_COLORS) {
      return parseColor(nearestHumanColor.STANDARD_COLORS[source]);
    }

    var hexMatch = source.match(/^#?((?:[0-9a-f]{3}){1,2})$/i);
    if (hexMatch) {
      hexMatch = hexMatch[1];

      if (hexMatch.length === 3) {
        hexMatch = [
          hexMatch.charAt(0) + hexMatch.charAt(0),
          hexMatch.charAt(1) + hexMatch.charAt(1),
          hexMatch.charAt(2) + hexMatch.charAt(2)
        ];

      } else {
        hexMatch = [
          hexMatch.substring(0, 2),
          hexMatch.substring(2, 4),
          hexMatch.substring(4, 6)
        ];
      }

      red = parseInt(hexMatch[0], 16);
      green = parseInt(hexMatch[1], 16);
      blue = parseInt(hexMatch[2], 16);


      return { r: red, g: green, b: blue };
    }

    var rgbMatch = source.match(/^rgb\(\s*(\d{1,3}%?),\s*(\d{1,3}%?),\s*(\d{1,3}%?)\s*\)$/i);
    if (rgbMatch) {
      red = parseComponentValue(rgbMatch[1]);
      green = parseComponentValue(rgbMatch[2]);
      blue = parseComponentValue(rgbMatch[3]);

      return { r: red, g: green, b: blue };
    }

    throw Error('"' + source + '" is not a valid color');
  }

  /**
   * Creates a {@link ColorSpec} from either a string or an {@link RGB}.
   *
   * @private
   * @param {string|RGB} input
   * @param {string=} name
   * @return {ColorSpec}
   *
   * @example
   * createColorSpec('#800'); // => {
   *   source: '#800',
   *   rgb: { r: 136, g: 0, b: 0 }
   * }
   *
   * createColorSpec('#800', 'maroon'); // => {
   *   name: 'maroon',
   *   source: '#800',
   *   rgb: { r: 136, g: 0, b: 0 }
   * }
   */
  function createColorSpec(input, name) {
    var color = {};

    if (name) {
      color.name = name;
    }

    if (typeof input === 'string') {
      color.source = input;
      color.rgb = parseColor(input);
      color.lab = hexToLab(input);

    } else if (typeof input === 'object') {
      // This is for if/when we're concatenating lists of colors.
      if (input.source) {
        return createColorSpec(input.source, input.name);
      }
      color.rgb = input;
      color.lab = hexToLab(input);
      color.source = rgbToHex(input);
    }

    return color;
  }

  /**
   * Parses a value between 0-255 from a string.
   *
   * @private
   * @param {string} string
   * @return {number}
   *
   * @example
   * parseComponentValue('100');  // => 100
   * parseComponentValue('100%'); // => 255
   * parseComponentValue('50%');  // => 128
   */
  function parseComponentValue(string) {
    if (string.charAt(string.length - 1) === '%') {
      return Math.round(parseInt(string, 10) * 255 / 100);
    }

    return Number(string);
  }

  /**
   * Converts an {@link RGB} color to its hex representation.
   *
   * @private
   * @param {RGB} rgb
   * @return {string}
   *
   * @example
   * rgbToHex({ r: 255, g: 128, b: 0 }); // => '#ff8000'
   */
  function rgbToHex(rgb) {
    return '#' + leadingZero(rgb.r.toString(16)) +
      leadingZero(rgb.g.toString(16)) + leadingZero(rgb.b.toString(16));
  }

  /**
   * Puts a 0 in front of a numeric string if it's only one digit. Otherwise
   * nothing (just returns the value passed in).
   *
   * @private
   * @param {string} value
   * @return
   *
   * @example
   * leadingZero('1');  // => '01'
   * leadingZero('12'); // => '12'
   */
  function leadingZero(value) {
    if (value.length === 1) {
      value = '0' + value;
    }
    return value;
  }

  /**
   * @author Markus Ekholm
   * @copyright 2012-2016 (c) Markus Ekholm <markus at botten dot org >
   * @license Copyright (c) 2012-2016, Markus Ekholm
   * All rights reserved.
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *    * Redistributions of source code must retain the above copyright
   *      notice, this list of conditions and the following disclaimer.
   *    * Redistributions in binary form must reproduce the above copyright
   *      notice, this list of conditions and the following disclaimer in the
   *      documentation and/or other materials provided with the distribution.
   *    * Neither the name of the author nor the
   *      names of its contributors may be used to endorse or promote products
   *      derived from this software without specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL MARKUS EKHOLM BE LIABLE FOR ANY
   * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
   * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
   * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
   * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
   * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   */

  /**
   * IMPORTS
   */
  var sqrt = Math.sqrt;
  var pow = Math.pow;
  var cos = Math.cos;
  var atan2 = Math.atan2;
  var sin = Math.sin;
  var abs = Math.abs;
  var exp = Math.exp;
  var PI = Math.PI;

  /**
   * API FUNCTIONS
   */

  /**
   * Returns diff between c1 and c2 using the CIEDE2000 algorithm
   * @param {labcolor} c1    Should have fields L,a,b
   * @param {labcolor} c2    Should have fields L,a,b
   * @return {float}   Difference between c1 and c2
   */
  function ciede2000(color1, color2) {
    /**
     * Implemented as in "The CIEDE2000 Color-Difference Formula:
     * Implementation Notes, Supplementary Test Data, and Mathematical Observations"
     * by Gaurav Sharma, Wencheng Wu and Edul N. Dalal.
     */
    var c1 = {L: color1[0], a: color1[1], b: color1[2]};
    var c2 = {L: color2[0], a: color2[1], b: color2[2]};

    // Get L,a,b values for color 1
    var L1 = c1.L;
    var a1 = c1.a;
    var b1 = c1.b;

    // Get L,a,b values for color 2
    var L2 = c2.L;
    var a2 = c2.a;
    var b2 = c2.b;

    // Weight factors
    var kL = 1;
    var kC = 1;
    var kH = 1;

    /**
     * Step 1: Calculate C1p, C2p, h1p, h2p
     */
    var C1 = sqrt(pow(a1, 2) + pow(b1, 2)) //(2)
    var C2 = sqrt(pow(a2, 2) + pow(b2, 2)) //(2)

    var a_C1_C2 = (C1 + C2) / 2.0; //(3)

    var G = 0.5 * (1 - sqrt(pow(a_C1_C2, 7.0) /
      (pow(a_C1_C2, 7.0) + pow(25.0, 7.0)))); //(4)

    var a1p = (1.0 + G) * a1; //(5)
    var a2p = (1.0 + G) * a2; //(5)

    var C1p = sqrt(pow(a1p, 2) + pow(b1, 2)); //(6)
    var C2p = sqrt(pow(a2p, 2) + pow(b2, 2)); //(6)

    var h1p = hp_f(b1, a1p); //(7)
    var h2p = hp_f(b2, a2p); //(7)

    /**
     * Step 2: Calculate dLp, dCp, dHp
     */
    var dLp = L2 - L1; //(8)
    var dCp = C2p - C1p; //(9)

    var dhp = dhp_f(C1, C2, h1p, h2p); //(10)
    var dHp = 2 * sqrt(C1p * C2p) * sin(radians(dhp) / 2.0); //(11)

    /**
     * Step 3: Calculate CIEDE2000 Color-Difference
     */
    var a_L = (L1 + L2) / 2.0; //(12)
    var a_Cp = (C1p + C2p) / 2.0; //(13)

    var a_hp = a_hp_f(C1, C2, h1p, h2p); //(14)
    var T = 1 - 0.17 * cos(radians(a_hp - 30)) + 0.24 * cos(radians(2 * a_hp)) +
      0.32 * cos(radians(3 * a_hp + 6)) - 0.20 * cos(radians(4 * a_hp - 63)); //(15)
    var d_ro = 30 * exp(-(pow((a_hp - 275) / 25, 2))); //(16)
    var RC = sqrt((pow(a_Cp, 7.0)) / (pow(a_Cp, 7.0) + pow(25.0, 7.0))); //(17)
    var SL = 1 + ((0.015 * pow(a_L - 50, 2)) /
      sqrt(20 + pow(a_L - 50, 2.0))); //(18)
    var SC = 1 + 0.045 * a_Cp; //(19)
    var SH = 1 + 0.015 * a_Cp * T; //(20)
    var RT = -2 * RC * sin(radians(2 * d_ro)); //(21)
    var dE = sqrt(pow(dLp / (SL * kL), 2) + pow(dCp / (SC * kC), 2) +
      pow(dHp / (SH * kH), 2) + RT * (dCp / (SC * kC)) *
      (dHp / (SH * kH))); //(22)
    return dE;
  }

  /**
   * INTERNAL FUNCTIONS
   */
  function degrees(n) {
    return n * (180 / PI);
  }

  function radians(n) {
    return n * (PI / 180);
  }

  function hp_f(x, y) //(7)
  {
    if (x === 0 && y === 0) return 0;
    else {
      var tmphp = degrees(atan2(x, y));
      if (tmphp >= 0) return tmphp
      else return tmphp + 360;
    }
  }

  function dhp_f(C1, C2, h1p, h2p) //(10)
  {
    if (C1 * C2 === 0) return 0;
    else if (abs(h2p - h1p) <= 180) return h2p - h1p;
    else if ((h2p - h1p) > 180) return (h2p - h1p) - 360;
    else if ((h2p - h1p) < -180) return (h2p - h1p) + 360;
    else throw (new Error());
  }

  function a_hp_f(C1, C2, h1p, h2p) { //(14)
    if (C1 * C2 === 0) return h1p + h2p
    else if (abs(h1p - h2p) <= 180) return (h1p + h2p) / 2.0;
    else if ((abs(h1p - h2p) > 180) && ((h1p + h2p) < 360)) return (h1p + h2p + 360) / 2.0;
    else if ((abs(h1p - h2p) > 180) && ((h1p + h2p) >= 360)) return (h1p + h2p - 360) / 2.0;
    else throw (new Error());
  }

  // End:

  /**
   * A map from the names of standard CSS colors to their hex values.
   */
  nearestHumanColor.STANDARD_COLORS = {
    aqua: '#0ff',
    black: '#000',
    blue: '#00f',
    fuchsia: '#f0f',
    gray: '#808080',
    green: '#008000',
    lime: '#0f0',
    maroon: '#800000',
    navy: '#000080',
    olive: '#808000',
    orange: '#ffa500',
    purple: '#800080',
    red: '#f00',
    silver: '#c0c0c0',
    teal: '#008080',
    white: '#fff',
    yellow: '#ff0'
  };

  /**
   * Default colors. Comprises the colors of the rainbow (good ol' ROY G. BIV).
   * This list will be used for calls to {@nearestHumanColor} that don't specify a list
   * of available colors to match.
   */
  nearestHumanColor.DEFAULT_COLORS = mapColors([
    '#f00', // r
    '#f80', // o
    '#ff0', // y
    '#0f0', // g
    '#00f', // b
    '#008', // i
    '#808'  // v
  ]);

  nearestHumanColor.VERSION = '1.0.1';

  if (typeof module === 'object' && module && module.exports) {
    module.exports = nearestHumanColor;
  } else {
    context.nearestHumanColor = nearestHumanColor;
  }

}(this));
