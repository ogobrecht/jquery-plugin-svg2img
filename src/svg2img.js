(function($) {

    $.fn.svg2img = function(options) {

        // define settings and some vars
        var settings = $.extend({}, $.fn.svg2img.defaults, options);
        var body = $('body'),
            exportWorkInProgress = false,
            jobQueue = [],
            timing = {};

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
            var usedStyles = [],
                styleSheets = (element.ownerDocument || document).styleSheets;
            $(styleSheets).each(function(i, sheet) {
                $(sheet.cssRules).each(function(i, rule) {
                    var cssSelectorUsed = false;
                    try {
                        cssSelectorUsed = ($(element).find(rule.selectorText).length > 0);
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

        // helper function to split multiple formats
        var svg2image = function(element, format) {

            $(format.split(',')).each(function(i, singleFormat) {
                if (['svg', 'png', 'gif', 'jpg', 'jpeg', 'bmp'].indexOf(singleFormat) < 0) {
                    // user requested unsupported image format
                    warn('invalid image format "' + singleFormat + '" - possible formats are svg, png, gif, jpeg, bmp');
                } else {
                    svg2imageExporter(element, singleFormat);
                }
            });


        };

        // helper function to export one svg
        var svg2imageExporter = function(element, format) {
            if (exportWorkInProgress) {
                jobQueue.push({
                    element: element,
                    format: format
                });
                if (settings.debug) {
                    log('export already running - queue additional ' + format + ' export');
                }
            } else {
                var original, copy, svgContainer, blob, fileName, canvas, ctx, img, dataUri, job;
                exportWorkInProgress = true;
                if (settings.debug) {
                    timing.startExport = new Date().getTime();
                    log('1 - start ' + (format !== 'svg' ? format + ' (canvas)' : format) + ' export');
                }

                // create a "standalone" SVG copy in the DOM (with XML namespace definiton)
                body.append('<div id="tempSvgContainerForExport" style="display:none;"></div>');
                svgContainer = $('#tempSvgContainerForExport');
                original = $(element);
                original.clone(false).appendTo(svgContainer);
                if (settings.debug) {
                    timing.endClone = new Date().getTime();
                    log('2 - clone of original SVG done (' + (timing.endClone - timing.startExport) + 'ms)');
                }

                // modifiy attributes for standalone SVG
                copy = svgContainer.find('svg');
                copy.prepend('<style type="text/css">' + getUsedStyles(original.parent()[0]).join(' ') + '</style>')
                    .attr('xmlns', 'http://www.w3.org/2000/svg')
                    .attr('version', '1.1')
                    .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
                    .css('border', 'none');
                fileName = (original.attr('id') || original.parent().attr('id') || 'export') + '-' + formatLocalDate() + '.' + format;
                if (settings.debug) {
                    timing.endStylesAttributes = new Date().getTime();
                    log('3 - collect styles and modify attributes done (' + (timing.endStylesAttributes - timing.endClone) + 'ms)');
                }

                // save to SVG
                if (format === 'svg') {

                    blob = new Blob([svgContainer.html()], {
                        type: "image/svg+xml;charset=utf-8"
                    });
                    saveAs(blob, fileName);

                    // remove temporary DOM object
                    svgContainer.remove();
                    exportWorkInProgress = false;
                    if (settings.debug) {
                        timing.endSvgExport = new Date().getTime();
                        log('4 - save to blob done (' + (timing.endSvgExport - timing.endStylesAttributes) + 'ms)');
                        log('5 - runtime for file ' + fileName + ': ' + (timing.endSvgExport - timing.startExport) + 'ms');
                    }

                    // start next image, if any
                    if (jobQueue.length > 0) {
                        job = jobQueue.shift();
                        svg2imageExporter(job.element, job.format);
                    }
                }

                // save to png, gif, jpeg, bmp
                else if (['png', 'gif', 'jpg', 'jpeg', 'bmp'].indexOf(format) > -1) {

                    // https://developer.mozilla.org/de/docs/Web/API/Canvas_API/Drawing_DOM_objects_into_a_canvas
                    body.append('<canvas id="tempCanvasForExport" style="display:none;"></canvas>');
                    canvas = $('#tempCanvasForExport')
                        .attr('height', original.attr('height') || parseFloat(original.css('height')))
                        .attr('width', original.attr('width') || parseFloat(original.css('width')));
                    ctx = canvas[0].getContext('2d');
                    if (settings.debug) {
                        timing.endCanvasInit = new Date().getTime();
                        log('4 - canvas init done (' + (timing.endCanvasInit - timing.endStylesAttributes) + 'ms)');
                    }

                    // create a data URI to render our svg to canvas
                    dataUri = 'data:image/svg+xml;base64,' + window.btoa(svgContainer.html());
                    if (settings.debug) {
                        timing.endCreateDataUri = new Date().getTime();
                        log('5 - create data URI done (' + (timing.endCreateDataUri - timing.endCanvasInit) + 'ms)');
                    }

                    // load up our image.
                    img = new Image();
                    img.src = dataUri;

                    // normalize jpg for correct mime type (image/jpeg)
                    if (format === 'jpg') {
                        format = 'jpeg';
                        warn('wrong mime type jpg - normalized to jpeg');
                    }

                    // check parameter jpegQuality
                    if (format === 'jpeg' && (settings.jpegQuality < 0 || settings.jpegQuality > 1)) {
                        settings.jpegQuality = 1;
                        warn('invalid value for jpegQuality - must be between 0 and 1 (1=100%)');
                    }

                    // render SVG image to the canvas when it is complete loaded
                    img.onload = function() {
                        if (settings.debug) {
                            timing.endLoadImage = new Date().getTime();
                            log('6 - load image (data URI) done (' + (timing.endLoadImage - timing.endCreateDataUri) + 'ms)');
                        }

                        // draw image
                        ctx.drawImage(img, 0, 0);
                        if (settings.debug) {
                            timing.endDrawImage = new Date().getTime();
                            log('7 - draw image on canvas done (' + (timing.endDrawImage - timing.endLoadImage) + 'ms)');
                        }

                        // save to blob: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
                        canvas[0].toBlob(
                            function(blob) {
                                saveAs(blob, fileName);
                            },
                            'image/' + format,
                            settings.jpegQuality
                        );

                        // remove temporary DOM objects
                        svgContainer.remove();
                        canvas.remove();
                        exportWorkInProgress = false;
                        if (settings.debug) {
                            timing.endCanvasExport = new Date().getTime();
                            log('8 - save to blob done (' + (timing.endCanvasExport - timing.endDrawImage) + 'ms)');
                            log('9 - runtime for file ' + fileName + ': ' + (timing.endCanvasExport - timing.startExport) + 'ms');
                        }

                        // start next image, if any
                        if (jobQueue.length > 0) {
                            job = jobQueue.shift();
                            svg2imageExporter(job.element, job.format);
                        }
                    };
                }
            }

        };

        // MAIN
        this.each(function(i, node) {
            if (node.tagName === 'svg') {
                svg2image(node, settings.format);
            } else {
                $(node).find('svg').each(function(i, svg) {
                    svg2image(svg, settings.format);
                });
            }
        });

        return this;

    };

    // plugin defaults
    $.fn.svg2img.defaults = {
        format: "svg", // svg, png, gif, jpeg or bmp - multiple formats possible: "svg,png"
        jpegQuality: 1, // between 0 and 1 (0% and 100% JPEG quality)
        debug: false // write debug information to console
    };

}(jQuery));
