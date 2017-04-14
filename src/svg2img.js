(function($) {

    $.fn.svg2img = function(options) {

        // define settings and some vars
        var settings = $.extend({}, $.fn.svg2img.defaults, options);
        var timing = {};

        timing.start = new Date().getTime();

        // helper functions for console log and warn
        var log = function(message) {
            if (settings.debug) {
                console.log('svg2img: ' + message);
            }
        };
        var warn = function(message) {
            console.warn('svg2img: ' + message);
        };

        // helper function to get all used styles for a DOM element
        // http://stackoverflow.com/questions/13204785/is-it-possible-to-read-the-styles-of-css-classes-not-being-used-in-the-dom-using
        var getUsedStyles = function(element) {
            var elem = $(element);
            var usedStyles = [],
                styleSheets = (element.ownerDocument || document).styleSheets;
            $(styleSheets).each(function(i, sheet) {
                $(sheet.cssRules).each(function(i, rule) {
                    var cssSelectorUsed = false;
                    try {
                        cssSelectorUsed = (elem.find(rule.selectorText).length > 0);
                    } catch (error) {
                        warn("Unable to check if CSS selector is used: " + rule.selectorText, error);
                    }
                    if (cssSelectorUsed) {
                        usedStyles.push(rule.cssText);
                    }
                });
            });
            return usedStyles;
        };

        // helper function to create formatted date string
        // http://stackoverflow.com/questions/17415579/how-to-iso-8601-format-a-date-with-timezone-offset-in-javascript
        var formatLocalDate = function() {
            var now = new Date();
            var pad = function(num) {
                var norm = Math.abs(Math.floor(num));
                return (norm < 10 ? '0' : '') + norm;
            };
            return now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' + pad(now.getHours()) +
                pad(now.getMinutes()) + pad(now.getSeconds());
        };


        // helper function to export one svg
        var svg2image = function(element) {
            var elem, fileName, svgText, blob;

            if (settings.debug) {
                timing.startExport = new Date().getTime();
                log('1 - start SVG export');
            }

            elem = $(element);
            fileName = (elem.attr('id') || elem.parent().attr('id') || 'export') + '-' + formatLocalDate() + '.svg';
            svgText = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">' +
                '<style type="text/css">' + getUsedStyles(elem.parent()[0]).join(' ') + '</style>' +
                elem.clone().wrap('<p/>').parent().html() + '</svg>';

            if (settings.debug) {
                timing.endClone = new Date().getTime();
                log('2 - clone of original SVG and collect styles done (' + (timing.endClone - timing.startExport) + 'ms)');
            }

            blob = new Blob([svgText], {
                type: "image/svg+xml;charset=utf-8"
            });

            saveAs(blob, fileName);

            if (settings.debug) {
                timing.endSvgExport = new Date().getTime();
                log('3 - save to blob done (' + (timing.endSvgExport - timing.endClone) + 'ms)');
                log('4 - runtime for file ' + fileName + ': ' + (timing.endSvgExport - timing.startExport) + 'ms');
            }

        };

        // MAIN
        this.each(function(i, node) {
            if (node.tagName === 'svg') {
                svg2image(node);
            } else {
                $(node).find('svg').each(function(i, svg) {
                    svg2image(svg);
                });
            }
        });

        return this;

    };

    // plugin defaults
    $.fn.svg2img.defaults = {
        debug: false
    };

}(jQuery));
