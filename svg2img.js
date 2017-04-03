/**
 * jQuery plugin svg2img - v1.0.0 - 2017-04-03
 * https://github.com/ogobrecht/jquery-plugin-svg2img
 * Copyright (c) 2017 Ottmar Gobrecht - MIT license
 */

/*! @file src/svg2img.js */

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


/*! @file lib/Blob.js/Blob.js */

/* Blob.js
 * A Blob implementation.
 * 2014-07-24
 *
 * By Eli Grey, http://eligrey.com
 * By Devin Samarin, https://github.com/dsamarin
 * License: MIT
 *   See https://github.com/eligrey/Blob.js/blob/master/LICENSE.md
 */

/*global self, unescape */
/*jslint bitwise: true, regexp: true, confusion: true, es5: true, vars: true, white: true,
  plusplus: true */

/*! @source http://purl.eligrey.com/github/Blob.js/blob/master/Blob.js */

(function (view) {
	"use strict";

	view.URL = view.URL || view.webkitURL;

	if (view.Blob && view.URL) {
		try {
			new Blob;
			return;
		} catch (e) {}
	}

	// Internally we use a BlobBuilder implementation to base Blob off of
	// in order to support older browsers that only have BlobBuilder
	var BlobBuilder = view.BlobBuilder || view.WebKitBlobBuilder || view.MozBlobBuilder || (function(view) {
		var
			  get_class = function(object) {
				return Object.prototype.toString.call(object).match(/^\[object\s(.*)\]$/)[1];
			}
			, FakeBlobBuilder = function BlobBuilder() {
				this.data = [];
			}
			, FakeBlob = function Blob(data, type, encoding) {
				this.data = data;
				this.size = data.length;
				this.type = type;
				this.encoding = encoding;
			}
			, FBB_proto = FakeBlobBuilder.prototype
			, FB_proto = FakeBlob.prototype
			, FileReaderSync = view.FileReaderSync
			, FileException = function(type) {
				this.code = this[this.name = type];
			}
			, file_ex_codes = (
				  "NOT_FOUND_ERR SECURITY_ERR ABORT_ERR NOT_READABLE_ERR ENCODING_ERR "
				+ "NO_MODIFICATION_ALLOWED_ERR INVALID_STATE_ERR SYNTAX_ERR"
			).split(" ")
			, file_ex_code = file_ex_codes.length
			, real_URL = view.URL || view.webkitURL || view
			, real_create_object_URL = real_URL.createObjectURL
			, real_revoke_object_URL = real_URL.revokeObjectURL
			, URL = real_URL
			, btoa = view.btoa
			, atob = view.atob

			, ArrayBuffer = view.ArrayBuffer
			, Uint8Array = view.Uint8Array

			, origin = /^[\w-]+:\/*\[?[\w\.:-]+\]?(?::[0-9]+)?/
		;
		FakeBlob.fake = FB_proto.fake = true;
		while (file_ex_code--) {
			FileException.prototype[file_ex_codes[file_ex_code]] = file_ex_code + 1;
		}
		// Polyfill URL
		if (!real_URL.createObjectURL) {
			URL = view.URL = function(uri) {
				var
					  uri_info = document.createElementNS("http://www.w3.org/1999/xhtml", "a")
					, uri_origin
				;
				uri_info.href = uri;
				if (!("origin" in uri_info)) {
					if (uri_info.protocol.toLowerCase() === "data:") {
						uri_info.origin = null;
					} else {
						uri_origin = uri.match(origin);
						uri_info.origin = uri_origin && uri_origin[1];
					}
				}
				return uri_info;
			};
		}
		URL.createObjectURL = function(blob) {
			var
				  type = blob.type
				, data_URI_header
			;
			if (type === null) {
				type = "application/octet-stream";
			}
			if (blob instanceof FakeBlob) {
				data_URI_header = "data:" + type;
				if (blob.encoding === "base64") {
					return data_URI_header + ";base64," + blob.data;
				} else if (blob.encoding === "URI") {
					return data_URI_header + "," + decodeURIComponent(blob.data);
				} if (btoa) {
					return data_URI_header + ";base64," + btoa(blob.data);
				} else {
					return data_URI_header + "," + encodeURIComponent(blob.data);
				}
			} else if (real_create_object_URL) {
				return real_create_object_URL.call(real_URL, blob);
			}
		};
		URL.revokeObjectURL = function(object_URL) {
			if (object_URL.substring(0, 5) !== "data:" && real_revoke_object_URL) {
				real_revoke_object_URL.call(real_URL, object_URL);
			}
		};
		FBB_proto.append = function(data/*, endings*/) {
			var bb = this.data;
			// decode data to a binary string
			if (Uint8Array && (data instanceof ArrayBuffer || data instanceof Uint8Array)) {
				var
					  str = ""
					, buf = new Uint8Array(data)
					, i = 0
					, buf_len = buf.length
				;
				for (; i < buf_len; i++) {
					str += String.fromCharCode(buf[i]);
				}
				bb.push(str);
			} else if (get_class(data) === "Blob" || get_class(data) === "File") {
				if (FileReaderSync) {
					var fr = new FileReaderSync;
					bb.push(fr.readAsBinaryString(data));
				} else {
					// async FileReader won't work as BlobBuilder is sync
					throw new FileException("NOT_READABLE_ERR");
				}
			} else if (data instanceof FakeBlob) {
				if (data.encoding === "base64" && atob) {
					bb.push(atob(data.data));
				} else if (data.encoding === "URI") {
					bb.push(decodeURIComponent(data.data));
				} else if (data.encoding === "raw") {
					bb.push(data.data);
				}
			} else {
				if (typeof data !== "string") {
					data += ""; // convert unsupported types to strings
				}
				// decode UTF-16 to binary string
				bb.push(unescape(encodeURIComponent(data)));
			}
		};
		FBB_proto.getBlob = function(type) {
			if (!arguments.length) {
				type = null;
			}
			return new FakeBlob(this.data.join(""), type, "raw");
		};
		FBB_proto.toString = function() {
			return "[object BlobBuilder]";
		};
		FB_proto.slice = function(start, end, type) {
			var args = arguments.length;
			if (args < 3) {
				type = null;
			}
			return new FakeBlob(
				  this.data.slice(start, args > 1 ? end : this.data.length)
				, type
				, this.encoding
			);
		};
		FB_proto.toString = function() {
			return "[object Blob]";
		};
		FB_proto.close = function() {
			this.size = 0;
			delete this.data;
		};
		return FakeBlobBuilder;
	}(view));

	view.Blob = function(blobParts, options) {
		var type = options ? (options.type || "") : "";
		var builder = new BlobBuilder();
		if (blobParts) {
			for (var i = 0, len = blobParts.length; i < len; i++) {
				if (Uint8Array && blobParts[i] instanceof Uint8Array) {
					builder.append(blobParts[i].buffer);
				}
				else {
					builder.append(blobParts[i]);
				}
			}
		}
		var blob = builder.getBlob(type);
		if (!blob.slice && blob.webkitSlice) {
			blob.slice = blob.webkitSlice;
		}
		return blob;
	};

	var getPrototypeOf = Object.getPrototypeOf || function(object) {
		return object.__proto__;
	};
	view.Blob.prototype = getPrototypeOf(new view.Blob());
}(typeof self !== "undefined" && self || typeof window !== "undefined" && window || this.content || this));


/*! @file lib/canvas-toBlob.js/canvas-toBlob.js */

/* canvas-toBlob.js
 * A canvas.toBlob() implementation.
 * 2016-05-26
 * 
 * By Eli Grey, http://eligrey.com and Devin Samarin, https://github.com/eboyjr
 * License: MIT
 *   See https://github.com/eligrey/canvas-toBlob.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, regexp: true, confusion: true, es5: true, vars: true, white: true,
  plusplus: true */

/*! @source http://purl.eligrey.com/github/canvas-toBlob.js/blob/master/canvas-toBlob.js */

(function(view) {
"use strict";
var
	  Uint8Array = view.Uint8Array
	, HTMLCanvasElement = view.HTMLCanvasElement
	, canvas_proto = HTMLCanvasElement && HTMLCanvasElement.prototype
	, is_base64_regex = /\s*;\s*base64\s*(?:;|$)/i
	, to_data_url = "toDataURL"
	, base64_ranks
	, decode_base64 = function(base64) {
		var
			  len = base64.length
			, buffer = new Uint8Array(len / 4 * 3 | 0)
			, i = 0
			, outptr = 0
			, last = [0, 0]
			, state = 0
			, save = 0
			, rank
			, code
			, undef
		;
		while (len--) {
			code = base64.charCodeAt(i++);
			rank = base64_ranks[code-43];
			if (rank !== 255 && rank !== undef) {
				last[1] = last[0];
				last[0] = code;
				save = (save << 6) | rank;
				state++;
				if (state === 4) {
					buffer[outptr++] = save >>> 16;
					if (last[1] !== 61 /* padding character */) {
						buffer[outptr++] = save >>> 8;
					}
					if (last[0] !== 61 /* padding character */) {
						buffer[outptr++] = save;
					}
					state = 0;
				}
			}
		}
		// 2/3 chance there's going to be some null bytes at the end, but that
		// doesn't really matter with most image formats.
		// If it somehow matters for you, truncate the buffer up outptr.
		return buffer;
	}
;
if (Uint8Array) {
	base64_ranks = new Uint8Array([
		  62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1
		, -1, -1,  0, -1, -1, -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9
		, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25
		, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35
		, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
	]);
}
if (HTMLCanvasElement && (!canvas_proto.toBlob || !canvas_proto.toBlobHD)) {
	if (!canvas_proto.toBlob)
	canvas_proto.toBlob = function(callback, type /*, ...args*/) {
		  if (!type) {
			type = "image/png";
		} if (this.mozGetAsFile) {
			callback(this.mozGetAsFile("canvas", type));
			return;
		} if (this.msToBlob && /^\s*image\/png\s*(?:$|;)/i.test(type)) {
			callback(this.msToBlob());
			return;
		}

		var
			  args = Array.prototype.slice.call(arguments, 1)
			, dataURI = this[to_data_url].apply(this, args)
			, header_end = dataURI.indexOf(",")
			, data = dataURI.substring(header_end + 1)
			, is_base64 = is_base64_regex.test(dataURI.substring(0, header_end))
			, blob
		;
		if (Blob.fake) {
			// no reason to decode a data: URI that's just going to become a data URI again
			blob = new Blob
			if (is_base64) {
				blob.encoding = "base64";
			} else {
				blob.encoding = "URI";
			}
			blob.data = data;
			blob.size = data.length;
		} else if (Uint8Array) {
			if (is_base64) {
				blob = new Blob([decode_base64(data)], {type: type});
			} else {
				blob = new Blob([decodeURIComponent(data)], {type: type});
			}
		}
		callback(blob);
	};

	if (!canvas_proto.toBlobHD && canvas_proto.toDataURLHD) {
		canvas_proto.toBlobHD = function() {
			to_data_url = "toDataURLHD";
			var blob = this.toBlob();
			to_data_url = "toDataURL";
			return blob;
		}
	} else {
		canvas_proto.toBlobHD = canvas_proto.toBlob;
	}
}
}(typeof self !== "undefined" && self || typeof window !== "undefined" && window || this.content || this));


/*! @file lib/FileSaver.js/FileSaver.js */

/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.2
 * 2016-06-16 18:25:19
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, is_safari = /constructor/i.test(view.HTMLElement) || view.safari
		, is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent)
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		, arbitrary_revoke_timeout = 1000 * 40 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, force = type === force_saveable_type
				, object_url
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						var reader = new FileReader();
						reader.onloadend = function() {
							var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
							var popup = view.open(url, '_blank');
							if(!popup) view.location.href = url;
							url=undefined; // release reference before dispatching
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if (!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (force) {
						view.location.href = object_url;
					} else {
						var opened = view.open(object_url, "_blank");
						if (!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
			;
			filesaver.readyState = filesaver.INIT;

			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setTimeout(function() {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}

			fs_error();
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		}
	;
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function(){};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
  define("FileSaver.js", function() {
    return saveAs;
  });
}
