# jQuery Plugin SVG to Image

The aim of this small jQuery plugin is to easy convert inline SVG's to standalone image files without loosing styles:

```js
jQuery('#example-graph').svg2img();
```

The default options - you can redeclare it in the same way:

```js
jQuery.fn.svg2img.defaults = {
    format: "svg", // svg, png, gif, jpeg or bmp - multiple formats possible: "svg,png"
    jpegQuality: 1, // between 0 and 1 (0% and 100% JPEG quality)
    debug: false // write debug information to console
};
```

You can also set the options at runtime:

```js
$('#example-graph').svg2img({format: "svg,png", debug:true})
```

You can download all SVG's from one page by setting the selector to the document, body or svg - as you like it. There is no need for a `each()` call, `svg2img` works on the whole selection and is chainable:

```js
$("svg").svg2img().css("border","1px solid red");
```

There is a [online demo available][1].

One last thing: Safari has currently (as of this writing) problems with the underlaying `savAs()` implementation and tries to open the images in a new tab with or without success. See also this [issue][2].

[1]: https://ogobrecht.github.io/posts/2017-04-03-jquery-plugin-svg2img
[2]: https://github.com/eligrey/FileSaver.js/issues/267
